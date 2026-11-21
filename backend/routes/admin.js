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

module.exports = router;
