-- Simple Role Management for DO and Sales Executive System
-- Use these SQL commands to manage user roles

-- View all users and their current roles
SELECT 
    u.email,
    u.display_name,
    r.name as role,
    u.is_active,
    u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- View role permissions
SELECT 
    r.name as role,
    p.name as permission,
    p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.resource, p.action;

-- Assign DO role to a user
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'do') 
WHERE email = 'user@example.com';

-- Assign Admin role to a user
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin') 
WHERE email = 'user@example.com';

-- Check specific user's permissions
SELECT 
    u.email,
    r.name as role,
    p.name as permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'user@example.com';

-- Count users by role
SELECT 
    r.name as role,
    COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON r.id = u.role_id AND u.is_active = TRUE
GROUP BY r.id, r.name;

-- Activate/Deactivate user
UPDATE users SET is_active = TRUE WHERE email = 'user@example.com';
UPDATE users SET is_active = FALSE WHERE email = 'user@example.com';

-- Find users without roles
SELECT email, display_name, created_at 
FROM users 
WHERE role_id IS NULL;