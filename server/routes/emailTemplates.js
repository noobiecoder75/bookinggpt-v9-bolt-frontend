import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all templates for a user
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, is_active } = req.query;
    
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', req.user.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get a single template
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create a new template
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const {
      template_key,
      name,
      subject,
      body_html,
      body_text,
      variables,
      category,
      is_active,
      metadata
    } = req.body;

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: req.user.id,
        template_key,
        name,
        subject,
        body_html,
        body_text,
        variables: variables || [],
        category,
        is_active: is_active !== false,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
router.put('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      subject,
      body_html,
      body_text,
      variables,
      category,
      is_active,
      metadata
    } = req.body;

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name,
        subject,
        body_html,
        body_text,
        variables,
        category,
        is_active,
        metadata
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get template history
router.get('/templates/:id/history', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_template_history')
      .select('*')
      .eq('template_id', req.params.id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching template history:', error);
    res.status(500).json({ error: 'Failed to fetch template history' });
  }
});

// Restore template from history
router.post('/templates/:id/restore/:historyId', authenticateToken, async (req, res) => {
  try {
    // Get the history entry
    const { data: historyData, error: historyError } = await supabase
      .from('email_template_history')
      .select('*')
      .eq('id', req.params.historyId)
      .eq('template_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (historyError) throw historyError;

    if (!historyData) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    // Update the template with history data
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        subject: historyData.subject,
        body_html: historyData.body_html,
        body_text: historyData.body_text,
        variables: historyData.variables
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error restoring template:', error);
    res.status(500).json({ error: 'Failed to restore template' });
  }
});

// Duplicate a template
router.post('/templates/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    // Get the original template
    const { data: originalTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    if (!originalTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create a duplicate
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: req.user.id,
        template_key: `${originalTemplate.template_key}_copy`,
        name: `${originalTemplate.name} (Copy)`,
        subject: originalTemplate.subject,
        body_html: originalTemplate.body_html,
        body_text: originalTemplate.body_text,
        variables: originalTemplate.variables,
        category: originalTemplate.category,
        is_active: false, // Set duplicate as inactive by default
        metadata: originalTemplate.metadata,
        parent_template_id: originalTemplate.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ error: 'Failed to duplicate template' });
  }
});

// Preview template with variables
router.post('/templates/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { variables } = req.body;

    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Replace variables in template
    let subject = template.subject;
    let body_html = template.body_html;
    let body_text = template.body_text;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        body_html = body_html.replace(regex, value);
        if (body_text) {
          body_text = body_text.replace(regex, value);
        }
      });
    }

    res.json({
      subject,
      body_html,
      body_text
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// Get automation rules
router.get('/automation/rules', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_automation_rules')
      .select('*, email_templates(name, subject)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

// Create automation rule
router.post('/automation/rules', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      trigger_event,
      template_id,
      conditions,
      delay_minutes,
      is_active
    } = req.body;

    const { data, error } = await supabase
      .from('email_automation_rules')
      .insert({
        user_id: req.user.id,
        name,
        description,
        trigger_event,
        template_id,
        conditions: conditions || {},
        delay_minutes: delay_minutes || 0,
        is_active: is_active !== false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// Update automation rule
router.put('/automation/rules/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      trigger_event,
      template_id,
      conditions,
      delay_minutes,
      is_active
    } = req.body;

    const { data, error } = await supabase
      .from('email_automation_rules')
      .update({
        name,
        description,
        trigger_event,
        template_id,
        conditions,
        delay_minutes,
        is_active
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating automation rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// Delete automation rule
router.delete('/automation/rules/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_automation_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

export default router;