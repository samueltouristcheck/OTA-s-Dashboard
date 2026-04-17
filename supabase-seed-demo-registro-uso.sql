-- Datos DEMO falsos para "Registro de uso" (solo entornos de prueba; NO producción)
-- Supabase → SQL Editor → Run
-- Requiere tabla LoginEvent (supabase-migration-registro-uso.sql)
--
-- Para borrar estos datos: supabase-cleanup-demo-loginevent.sql
--
-- Las fechas usan NOW() - intervalo: al ejecutarlo verás datos en los últimos 30/90 días.
-- Puedes ejecutar este script varias veces (añade más filas).

INSERT INTO "LoginEvent" ("userId", "username", "role", "clienteNombre", "userAgent", "createdAt") VALUES

-- Super admins (últimos días)
('user-alexandra', 'Alexandra', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '45 minutes'),
('user-alexandra', 'Alexandra', 'admin', NULL, 'Mozilla/5.0 (Macintosh) Safari/18.1', NOW() - INTERVAL '1 day' + INTERVAL '9 hours'),
('user-alexandra', 'Alexandra', 'admin', NULL, 'Mozilla/5.0 (iPhone) Mobile/15E148', NOW() - INTERVAL '3 days' + INTERVAL '14 hours'),
('user-alexandra', 'Alexandra', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Edge/131.0', NOW() - INTERVAL '7 days' + INTERVAL '8 hours' + INTERVAL '12 minutes'),
('user-alexandra', 'Alexandra', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '12 days' + INTERVAL '16 hours'),

('user-samuel', 'Samuel', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '2 hours'),
('user-samuel', 'Samuel', 'admin', NULL, 'Mozilla/5.0 (X11; Linux) Firefox/133.0', NOW() - INTERVAL '1 day' + INTERVAL '18 hours'),
('user-samuel', 'Samuel', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '4 days' + INTERVAL '11 hours'),
('user-samuel', 'Samuel', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '9 days' + INTERVAL '7 hours' + INTERVAL '30 minutes'),
('user-samuel', 'samuel@ota.com', 'admin', NULL, 'Mozilla/5.0 (Android 15) Chrome/131.0', NOW() - INTERVAL '15 days' + INTERVAL '19 hours'),

-- Clientes conocidos del proyecto
('user-golondrinas', 'Golondrinas', 'client', 'Golondrinas', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '30 minutes'),
('user-golondrinas', 'Golondrinas', 'client', 'Golondrinas', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '5 hours'),
('user-golondrinas', 'Golondrinas', 'client', 'Golondrinas', 'Mozilla/5.0 (iPad) Safari/604.1', NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),
('user-golondrinas', 'Golondrinas', 'client', 'Golondrinas', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '2 days' + INTERVAL '10 hours' + INTERVAL '15 minutes'),
('user-golondrinas', 'Golondrinas', 'client', 'Golondrinas', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '6 days' + INTERVAL '8 hours'),

('user-mapfre', 'MAPFRE', 'client', 'MAPFRE', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '3 hours'),
('user-mapfre', 'MAPFRE', 'client', 'MAPFRE', 'Mozilla/5.0 (Macintosh) Chrome/131.0', NOW() - INTERVAL '1 day' + INTERVAL '15 hours'),
('user-mapfre', 'MAPFRE', 'client', 'MAPFRE', 'Mozilla/5.0 (Windows NT 10.0) Edge/131.0', NOW() - INTERVAL '8 days' + INTERVAL '12 hours'),

-- Clientes inventados (no tienen por qué existir en User)
('demo-fake-001', 'Museo del Prado Tours', 'client', 'Museo del Prado Tours', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', NOW() - INTERVAL '4 hours'),
('demo-fake-001', 'Museo del Prado Tours', 'client', 'Museo del Prado Tours', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', NOW() - INTERVAL '3 days' + INTERVAL '9 hours'),
('demo-fake-002', 'Barcelona City Pass', 'client', 'Barcelona City Pass', 'Mozilla/5.0 (Macintosh) Safari/17.2', NOW() - INTERVAL '1 day' + INTERVAL '7 hours'),
('demo-fake-002', 'Barcelona City Pass', 'client', 'Barcelona City Pass', 'Mozilla/5.0 (iPhone) Version/17.0', NOW() - INTERVAL '5 days' + INTERVAL '18 hours'),
('demo-fake-003', 'Andalucía Experiencias', 'client', 'Andalucía Experiencias', 'Mozilla/5.0 (X11; Linux) Firefox/132.0', NOW() - INTERVAL '6 hours'),
('demo-fake-003', 'Andalucía Experiencias', 'client', 'Andalucía Experiencias', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '11 days' + INTERVAL '10 hours'),
('demo-fake-004', 'Costa Brava OTA', 'client', 'Costa Brava OTA', 'Mozilla/5.0 (Windows NT 10.0) Edge/130.0', NOW() - INTERVAL '2 days' + INTERVAL '20 hours'),
('demo-fake-005', 'Sevilla Free Tour', 'client', 'Sevilla Free Tour', 'Mozilla/5.0 (Android 14) Chrome/129.0', NOW() - INTERVAL '35 minutes'),
('demo-fake-005', 'Sevilla Free Tour', 'client', 'Sevilla Free Tour', 'Mozilla/5.0 (Android 14) Chrome/129.0', NOW() - INTERVAL '4 days' + INTERVAL '13 hours'),
('demo-fake-006', 'Valencia Boats SL', 'client', 'Valencia Boats SL', 'Mozilla/5.0 (iPad) Safari/604.1', NOW() - INTERVAL '7 days' + INTERVAL '9 hours'),
('demo-fake-007', 'Granada Alhambra Tickets', 'client', 'Granada Alhambra Tickets', 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '14 days' + INTERVAL '11 hours'),
('demo-fake-008', 'Madrid Rooftops', 'client', 'Madrid Rooftops', 'Mozilla/5.0 (Macintosh) Chrome/131.0', NOW() - INTERVAL '20 days' + INTERVAL '16 hours'),
('demo-fake-009', 'Toledo Day Trips', 'client', 'Toledo Day Trips', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', NOW() - INTERVAL '25 days' + INTERVAL '8 hours'),

-- Picos de uso: mismo día, varias conexiones
('demo-fake-010', 'Equipo mañana (ficticio)', 'client', 'Equipo mañana (ficticio)', 'Mozilla/5.0 Chrome/131.0', NOW() - INTERVAL '1 day' + INTERVAL '7 hours'),
('demo-fake-010', 'Equipo mañana (ficticio)', 'client', 'Equipo mañana (ficticio)', 'Mozilla/5.0 Chrome/131.0', NOW() - INTERVAL '1 day' + INTERVAL '7 hours' + INTERVAL '12 minutes'),
('demo-fake-010', 'Equipo mañana (ficticio)', 'client', 'Equipo mañana (ficticio)', 'Mozilla/5.0 Chrome/131.0', NOW() - INTERVAL '1 day' + INTERVAL '7 hours' + INTERVAL '45 minutes'),
('demo-fake-010', 'Equipo mañana (ficticio)', 'client', 'Equipo mañana (ficticio)', 'Mozilla/5.0 Chrome/131.0', NOW() - INTERVAL '1 day' + INTERVAL '12 hours'),

-- Admin de prueba inventado
('demo-admin-fake', 'admin@2ota.com', 'admin', NULL, 'Mozilla/5.0 (Windows NT 10.0) Chrome/131.0', NOW() - INTERVAL '5 days' + INTERVAL '14 hours');
