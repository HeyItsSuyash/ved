const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const entityService = require('../services/entity');
const prisma = require('../services/db');

/**
 * @route   GET /admin/users
 * @desc    Get all users with entity counts (Admin only)
 * @access  Private/Admin
 */
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    
    // Enrich with entity counts
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const count = await prisma.entity.count({ 
        where: { userId: user.id }
      });
      const { password, ...safeUser } = user;
      return { ...safeUser, entityCount: count };
    }));

    res.json(enrichedUsers);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @route   GET /admin/analytics
 * @desc    Get global system analytics (Admin only)
 * @access  Private/Admin
 */
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const totalCalls = await prisma.call.count();
    const totalUsers = await prisma.user.count();
    const totalEntities = await prisma.entity.count();
    
    // Top intents across system
    const intentAggrRaw = await prisma.call.groupBy({
      by: ['intent'],
      _count: {
        intent: true
      },
      orderBy: {
        _count: {
          intent: 'desc'
        }
      },
      take: 5
    });

    res.json({
      totalCalls,
      totalUsers,
      totalEntities,
      topIntents: intentAggrRaw.map(i => ({ intent: i.intent || 'unknown', count: i._count.intent }))
    });
  } catch (error) {
    console.error('Global analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch system analytics' });
  }
});

/**
 * @route   GET /admin/leads
 * @desc    Get all leads across system (Admin only)
 * @access  Private/Admin
 */
router.get('/leads', authenticate, authorize('admin'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (error) {
    console.error('Admin leads error:', error);
    res.status(500).json({ error: 'Failed to fetch global leads' });
  }
});

/**
 * @route   GET /admin/entities
 * @desc    Get all entities (Admin only)
 */
router.get('/entities', authenticate, authorize('admin'), async (req, res) => {
  try {
    const entities = await entityService.getAllEntities();
    res.json(entities);
  } catch (error) {
    console.error('Admin entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

/**
 * @route   GET /admin/calls
 * @desc    Get all calls (Admin only)
 */
router.get('/calls', authenticate, authorize('admin'), async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(calls);
  } catch (error) {
    console.error('Admin calls error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Telephony Numbers & Routing Management State
let adminNumbersPool = [
  {
    id: 'num_1',
    number: process.env.EXOTEL_PHONE_NUMBER || '08047281152',
    label: 'Primary Helpline (Inbound & Outbound)',
    provider: 'exotel',
    status: 'Active',
    isPrimary: true,
    routingRule: 'always_active',
    assignedAgent: 'Default Agent',
    forwardTo: '',
    callsHandled: 12
  },
  {
    id: 'num_2',
    number: process.env.TWILIO_PHONE_NUMBER || '+16624818479',
    label: 'Twilio Line (Backup & Global)',
    provider: 'twilio',
    status: 'Active',
    isPrimary: false,
    routingRule: 'fallback_on_busy',
    assignedAgent: 'Default Agent',
    forwardTo: '',
    callsHandled: 5
  }
];

let globalRoutingRules = {
  strategy: 'primary_first', // 'primary_first' | 'round_robin' | 'simultaneous'
  fallbackTimeoutSeconds: 15,
  businessHoursOnly: false,
  businessHoursStart: '09:00',
  businessHoursEnd: '18:00',
  recordCalls: true,
  enableBargeIn: true
};

/**
 * @route   GET /admin/numbers
 * @desc    Get all phone numbers and routing configurations (Admin only)
 */
router.get('/numbers', authenticate, authorize('admin'), (req, res) => {
  res.json({
    numbers: adminNumbersPool,
    routingRules: globalRoutingRules
  });
});

/**
 * @route   POST /admin/numbers
 * @desc    Add a new phone number
 */
router.post('/numbers', authenticate, authorize('admin'), (req, res) => {
  try {
    const { number, label, provider, routingRule, assignedAgent, forwardTo } = req.body;
    if (!number) return res.status(400).json({ error: 'Phone number is required' });

    const cleanNum = number.trim();
    if (adminNumbersPool.some(n => n.number === cleanNum)) {
      return res.status(400).json({ error: 'Phone number already exists in registry' });
    }

    const newNumber = {
      id: `num_${Date.now()}`,
      number: cleanNum,
      label: label || `Line ${adminNumbersPool.length + 1}`,
      provider: (provider || 'exotel').toLowerCase(),
      status: 'Active',
      isPrimary: false, // First number is always the only primary number
      routingRule: routingRule || 'fallback_on_busy',
      assignedAgent: assignedAgent || 'Default Agent',
      forwardTo: forwardTo || '',
      callsHandled: 0
    };

    adminNumbersPool.push(newNumber);
    res.json({ success: true, number: newNumber, numbers: adminNumbersPool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /admin/numbers/:id
 * @desc    Edit a number's label, provider, or routing rules (Primary cannot be un-set directly)
 */
router.put('/numbers/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { number, label, provider, status, routingRule, assignedAgent, forwardTo, isPrimary } = req.body;

    const targetIdx = adminNumbersPool.findIndex(n => n.id === id);
    if (targetIdx === -1) return res.status(404).json({ error: 'Number not found' });

    // If making this number primary, ensure it moves to the first position
    if (isPrimary && !adminNumbersPool[targetIdx].isPrimary) {
      adminNumbersPool.forEach(n => { n.isPrimary = false; });
      const [item] = adminNumbersPool.splice(targetIdx, 1);
      item.isPrimary = true;
      adminNumbersPool.unshift(item); // First number is strictly primary
    } else {
      const item = adminNumbersPool[targetIdx];
      if (number) item.number = number.trim();
      if (label !== undefined) item.label = label;
      if (provider !== undefined) item.provider = provider.toLowerCase();
      if (status !== undefined) item.status = status;
      if (routingRule !== undefined) item.routingRule = routingRule;
      if (assignedAgent !== undefined) item.assignedAgent = assignedAgent;
      if (forwardTo !== undefined) item.forwardTo = forwardTo;
    }

    // Enforce rule: the first number in the list is always the primary number
    adminNumbersPool.forEach((n, idx) => {
      n.isPrimary = (idx === 0);
    });

    res.json({ success: true, numbers: adminNumbersPool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /admin/numbers/:id
 * @desc    Delete a phone number (cannot delete the primary number)
 */
router.delete('/numbers/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const target = adminNumbersPool.find(n => n.id === id);
    if (!target) return res.status(404).json({ error: 'Number not found' });

    if (target.isPrimary) {
      return res.status(400).json({ error: 'Cannot delete the primary number. Set another number as primary first.' });
    }

    adminNumbersPool = adminNumbersPool.filter(n => n.id !== id);
    // Ensure first number remains primary
    if (adminNumbersPool.length > 0) {
      adminNumbersPool[0].isPrimary = true;
    }

    res.json({ success: true, numbers: adminNumbersPool });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /admin/routing-rules
 * @desc    Update global routing rules
 */
router.post('/routing-rules', authenticate, authorize('admin'), (req, res) => {
  try {
    const rules = req.body;
    globalRoutingRules = { ...globalRoutingRules, ...rules };
    res.json({ success: true, routingRules: globalRoutingRules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
