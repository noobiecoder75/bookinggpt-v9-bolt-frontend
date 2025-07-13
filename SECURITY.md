# Security Implementation Guide

## Overview

This document outlines the comprehensive security implementation for the BookingGPT travel booking application. The security system implements defense-in-depth principles with multiple layers of protection.

## Security Architecture

### 1. Authentication & Authorization
- **Supabase Auth**: JWT-based authentication with secure token management
- **Row Level Security (RLS)**: Database-level access control
- **Agent-based Access Control**: All data access is scoped to authenticated agents
- **API Authentication**: Server routes require valid JWT tokens

### 2. Database Security

#### Row Level Security (RLS) Policies
All sensitive tables have RLS enabled with agent-specific policies:

```sql
-- Example: Customers table RLS policy
CREATE POLICY "agents_can_access_their_customers" ON customers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quotes q 
            WHERE q.customer_id = customers.id 
            AND q.agent_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM bookings b 
            WHERE b.customer_id = customers.id 
            AND b.agent_id = auth.uid()
        )
    );
```

#### Protected Tables
- ✅ `customers` - Agent-specific access through quotes/bookings
- ✅ `quotes` - Direct agent ownership (`agent_id = auth.uid()`)
- ✅ `bookings` - Direct agent ownership (`agent_id = auth.uid()`)
- ✅ `quote_items` - Access through parent quote ownership
- ✅ `booking_items` - Access through parent booking ownership
- ✅ `users` - Users can only access their own record
- ✅ `audit_logs` - Agents can only read their own audit logs

### 3. API Security

#### Authentication Middleware
All server routes use authentication middleware:

```javascript
// Authentication middleware
export async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  req.user = { id: user.id, email: user.email };
  next();
}
```

#### Protected Routes
- ✅ `/api/bookings/*` - Booking creation and management
- ✅ `/api/hotelbeds/*` - Hotel search and booking
- ✅ `/api/duffel/*` - Flight search and booking
- ✅ `/api/amadeus/*` - Flight search
- ✅ `/api/rates/*` - Rate management

### 4. Frontend Security

#### Authentication Context
- Secure JWT token storage
- Automatic token refresh
- User session management
- Protected route guards

#### Data Access Patterns
All frontend queries include explicit agent filtering:

```typescript
// Example: Secure customer fetching
const { data: customers, error } = await supabase
  .from('customers')
  .select('*')
  .eq('agent_id', user.id) // Explicit agent filtering
  .order('created_at', { ascending: false });
```

### 5. Audit & Monitoring

#### Audit Logging
Comprehensive audit trail for all data operations:

```sql
-- Audit log structure
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Automatic Triggers
Database triggers automatically log all CUD operations:
- `CREATE` operations on customers, quotes, bookings
- `UPDATE` operations with before/after values
- `DELETE` operations with deleted record details

#### Security Events
Dedicated security incident tracking:
- Failed authentication attempts
- Suspicious access patterns
- Policy violations
- System security events

### 6. Security Monitoring

#### Real-time Monitoring
- **Security Dashboard**: Real-time security metrics
- **Audit Log Viewer**: Searchable audit trail
- **Security Alerts**: Automated incident detection
- **Access Analytics**: Usage pattern analysis

#### Key Metrics
- Total user actions
- Daily activity counts
- Failed action rates
- Success rate percentages
- Security incident counts

## Security Best Practices

### For Developers

1. **Always Use RLS**: Never bypass RLS policies
2. **Explicit Filtering**: Always include agent_id filters in queries
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Don't expose sensitive information in errors
5. **Logging**: Log all security-relevant actions

### For Administrators

1. **Regular Audits**: Review audit logs regularly
2. **Policy Updates**: Keep RLS policies current
3. **Access Reviews**: Regularly review user access
4. **Incident Response**: Have a security incident response plan
5. **Monitoring**: Monitor security metrics and alerts

## Security Incident Response

### Incident Detection
1. **Automated Alerts**: System automatically detects anomalies
2. **Manual Reporting**: Users can report security concerns
3. **Log Analysis**: Regular audit log review
4. **Monitoring Dashboard**: Real-time security metrics

### Response Procedures
1. **Immediate Assessment**: Evaluate incident severity
2. **Containment**: Isolate affected systems/users
3. **Investigation**: Determine root cause and impact
4. **Remediation**: Fix vulnerabilities and restore service
5. **Documentation**: Record incident details and lessons learned

## Security Configuration

### Environment Variables
```bash
# Authentication
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Security
VITE_HOTELBEDS_API_KEY=your_hotelbeds_key
VITE_HOTELBEDS_SECRET=your_hotelbeds_secret
DUFFEL_ACCESS_TOKEN=your_duffel_token
```

### Database Configuration
```sql
-- Enable RLS on all public tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies
CREATE POLICY "policy_name" ON table_name
    FOR operation
    TO role
    USING (condition);
```

## Security Testing

### Automated Tests
- RLS policy validation
- Authentication flow testing
- Authorization boundary testing
- Input validation testing

### Manual Testing
- Penetration testing
- Social engineering assessment
- Physical security review
- Code review process

## Compliance & Standards

### Standards Compliance
- **OWASP Top 10**: Protection against common vulnerabilities
- **Data Protection**: GDPR/CCPA compliance measures
- **Industry Standards**: Travel industry security practices
- **API Security**: OWASP API Security Top 10

### Regular Assessments
- Quarterly security reviews
- Annual penetration testing
- Continuous vulnerability scanning
- Third-party security audits

## Security Updates

### Version History
- **v1.0.0**: Initial security implementation
- **v1.1.0**: Enhanced RLS policies
- **v1.2.0**: Audit logging system
- **v1.3.0**: Security monitoring dashboard

### Update Process
1. Security patch identification
2. Impact assessment
3. Testing in staging environment
4. Coordinated deployment
5. Post-deployment verification

## Contact Information

### Security Team
- **Security Lead**: [security@bookinggpt.ca](mailto:security@bookinggpt.ca)
- **Emergency Contact**: [emergency@bookinggpt.ca](mailto:emergency@bookinggpt.ca)
- **Bug Bounty**: [security-reports@bookinggpt.ca](mailto:security-reports@bookinggpt.ca)

### Reporting Security Issues
Please report security vulnerabilities to: [security@bookinggpt.ca](mailto:security@bookinggpt.ca)

**Do not disclose security issues publicly until they have been addressed.**

---

*This document is reviewed and updated quarterly. Last updated: [Current Date]* 