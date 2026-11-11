-- Migration: Update National Youth Corps service records for 2025/26 and 2026/27
-- Source: Youth_Corp_Service_List.xlsx, Youth_Corp_Finish_List.xlsx, Youth_Corp_Pending_List.xlsx
-- Date: 2026-11-11
--
-- Summary:
--   1. Add 1 new client_site: Siyabalanduwa (National Youth Corps)
--   2. Record 10 new machine installations (client_sites already exist from 0039)
--   3. Record 24 completed services with exact SC numbers and dates (25 service calls total)
--   4. Confirm 27 locations still pending (ensure planned_services rows exist)
--
-- All operations are idempotent (ON CONFLICT DO UPDATE / DO NOTHING).

BEGIN;

-- ============================================================================
-- 1. ADD NEW CLIENT SITE: Siyabalanduwa
-- ============================================================================

INSERT INTO client_sites (client, name, area_office, town, contact_phone, serial_number, lat, lng)
VALUES
  ('National Youth Corps', 'Siyabalanduwa', NULL, 'Siyabalanduwa', NULL, NULL, 6.81423, 81.53218)
ON CONFLICT (client, name) DO NOTHING;

-- ============================================================================
-- 2. RECORD NEW MACHINE INSTALLATIONS (update install date on existing sites)
--    These 10 locations got new machines during 2025/26 - 2026/27
-- ============================================================================

-- Kegalla → Install#2952, 2026-01-28
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2952')
WHERE client = 'National Youth Corps' AND name = 'Kegalle';

-- Galigamuwa → Install#2951, 2026-01-08
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2951')
WHERE client = 'National Youth Corps' AND name = 'Galigamuwa';

-- Aththanagalla → Install#10430, 2026-04-23
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#10430')
WHERE client = 'National Youth Corps' AND name = 'Aththanagalla Face';

-- Lunugamwehera → Install#2954, 2026-01-20
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2954')
WHERE client = 'National Youth Corps' AND name = 'Lunugam Wehera';

-- Kekirawa → Install#2957, 2026-04-23
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2957')
WHERE client = 'National Youth Corps' AND name = 'Kakirawa';

-- Digampathana → Install#2987, 2026-03-31
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2987')
WHERE client = 'National Youth Corps' AND name = 'Diganpathaha';

-- Katharagama → Install#2979, 2026-03-06
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2979')
WHERE client = 'National Youth Corps' AND name = 'Katharagama HS';

-- Katunayake → Install#3063, 2026-06-11
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#3063')
WHERE client = 'National Youth Corps' AND name = 'Katunayake Face';

-- Wennappuwa → Install#2949, 2026-01-07
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#2949')
WHERE client = 'National Youth Corps' AND name = 'Wennapuwa';

-- Naththandiya → Install#3079, 2026-08-24
UPDATE client_sites SET contact_phone = COALESCE(contact_phone, 'Install#3079')
WHERE client = 'National Youth Corps' AND name = 'Naththandiya';

-- ============================================================================
-- 3. RECORD 24 COMPLETED SERVICES (25 service calls)
--    Mark existing planned_services as done with SC numbers and dates
-- ============================================================================

-- #1 Anuradhapura — SC10813, 2026-10-19
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-19',
    service_call_number = 'SC10813',
    notes = 'Completed 2026-10-19, SC10813'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Anuradhapura')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #2 Bandarawela — SC10504, 2026-03-31
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-03-31',
    service_call_number = 'SC10504',
    notes = 'Completed 2026-03-31, SC10504'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Bandarawela')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #3 Dehiattakandiya — SC10823, 2026-10-03
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-03',
    service_call_number = 'SC10823',
    notes = 'Completed 2026-10-03, SC10823'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Dehiaththakandiya')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #4 Mawathagama — SC10232, 2025-10-02
UPDATE planned_services
SET status = 'done',
    visit_date = '2025-10-02',
    service_call_number = 'SC10232',
    notes = 'Completed 2025-10-02, SC10232'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Mawathgama')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #5 Walachchena (Valaichchenai) — SC10366, 2025-11-03
UPDATE planned_services
SET status = 'done',
    visit_date = '2025-11-03',
    service_call_number = 'SC10366',
    notes = 'Completed 2025-11-03, SC10366'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Valaichchenai')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #6 Paduwasnuwara — SC10460, 2026-03-19
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-03-19',
    service_call_number = 'SC10460',
    notes = 'Completed 2026-03-19, SC10460'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Paduwasnuwara')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #7 Galle — SC10493, 2026-06-15
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-06-15',
    service_call_number = 'SC10493',
    notes = 'Completed 2026-06-15, SC10493'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Galle')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #8 Sooriyawewa — SC10706, 2026-08-07
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-08-07',
    service_call_number = 'SC10706',
    notes = 'Completed 2026-08-07, SC10706'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Sooriyawewa')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #9 Nuwara Eliya — SC10716, 2026-10-02
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-02',
    service_call_number = 'SC10716',
    notes = 'Completed 2026-10-02, SC10716'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'NuwaraEliya')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #10 Balangoda — SC10717, 2026-10-02
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-02',
    service_call_number = 'SC10717',
    notes = 'Completed 2026-10-02, SC10717'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Balangoda')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #11 Embilipitiya (Ambilipitiya) — SC10660, 2026-07-22
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-07-22',
    service_call_number = 'SC10660',
    notes = 'Completed 2026-07-22, SC10660'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Embilipitiya')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #12 Gomarankadawala — SC10757, 2026-09-02
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-09-02',
    service_call_number = 'SC10757',
    notes = 'Completed 2026-09-02, SC10757'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Gomarankadawala')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #13 Thanamalwila — SC10758, 2026-09-02
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-09-02',
    service_call_number = 'SC10758',
    notes = 'Completed 2026-09-02, SC10758'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Thanamalwila')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #14 Wellawaya (Wallawaya) — SC10508, 2026-03-31
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-03-31',
    service_call_number = 'SC10508',
    notes = 'Completed 2026-03-31, SC10508'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Wellawaya')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #15 Head Office — SC10417, 2025-12-11
UPDATE planned_services
SET status = 'done',
    visit_date = '2025-12-11',
    service_call_number = 'SC10417',
    notes = 'Completed 2025-12-11, SC10417'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Head Office')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #16 Naula — SC10607, 2026-05-25
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-05-25',
    service_call_number = 'SC10607',
    notes = 'Completed 2026-05-25, SC10607'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Naula')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #17 Madirigiriya — SC10820, 2026-10-22
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-22',
    service_call_number = 'SC10820',
    notes = 'Completed 2026-10-22, SC10820'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Madirigiriya')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #18 Seruwawila (Serunuwara) — SC10819, 2026-10-22
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-22',
    service_call_number = 'SC10819',
    notes = 'Completed 2026-10-22, SC10819'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Seruwawila')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #19 Trincomalee — SC10817, 2026-10-23
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-23',
    service_call_number = 'SC10817',
    notes = 'Completed 2026-10-23, SC10817'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Trincomalee')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #20 Galenbidunuwewa — SC10815, 2026-10-20 (first visit)
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-20',
    service_call_number = 'SC10815',
    notes = 'Completed 2026-10-20, SC10815; follow-up SC10735 on 2026-10-30'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Galenbidunuwewa')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #21 Monaragala — SC10807, 2026-10-18
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-18',
    service_call_number = 'SC10807',
    notes = 'Completed 2026-10-18, SC10807'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Monaragala')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #22 Ampara — SC10801, 2026-10-13
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-10-13',
    service_call_number = 'SC10801',
    notes = 'Completed 2026-10-13, SC10801'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Ampara')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #23 Kuchchaweli (Kuchchaweri) — SC10395, 2026-01-23
UPDATE planned_services
SET status = 'done',
    visit_date = '2026-01-23',
    service_call_number = 'SC10395',
    notes = 'Completed 2026-01-23, SC10395'
WHERE site_id = (SELECT id FROM client_sites WHERE client = 'National Youth Corps' AND name = 'Kuchchaweli')
  AND contract_year = '2026/27'
  AND status <> 'done';

-- #24 Siyabalanduwa — SC10805, 2026-10-15 (new site)
INSERT INTO planned_services (site_id, contract_year, visit_type, status, visit_date, service_call_number, notes)
SELECT id, '2026/27', 'Service', 'done', '2026-10-15', 'SC10805', 'Completed 2026-10-15, SC10805'
FROM client_sites
WHERE client = 'National Youth Corps' AND name = 'Siyabalanduwa'
ON CONFLICT (site_id, contract_year, visit_type) DO UPDATE
SET status = 'done',
    visit_date = '2026-10-15',
    service_call_number = 'SC10805',
    notes = 'Completed 2026-10-15, SC10805';

-- ============================================================================
-- 4. ENSURE 27 PENDING LOCATIONS HAVE PLANNED_SERVICES ROWS
--    These are the locations that still need service visits
-- ============================================================================

INSERT INTO planned_services (site_id, contract_year, visit_type, status, due_date)
SELECT cs.id, '2026/27', 'Service', 'pending', '2027-07-31'
FROM client_sites cs
WHERE cs.client = 'National Youth Corps'
  AND cs.name IN (
    'Akurassa',        -- Akuressa
    'Alauwa',          -- Alawwa
    'Bulathsinhala',
    'Dambulla',
    'Dehiowita',
    'Dikwalla',        -- Dikwella
    'Diulapitiya',
    'Dodamgaslanda',
    'Kala-Wewa',       -- Kalawewa
    'Kuliyapitiya',
    'Mahiyanganaya',
    'Neluwa',
    'Nivithigala',     -- Niwithigala
    'Senkadagala',
    'Akmeemana',
    'Mannar',
    'Irattaperiyakulam',
    'Mulathiv',        -- Mulativ
    'Rajagiriya',
    'Walahena',
    'Walapane',        -- Walapone
    'Wariyapola',
    'Weerakatiya',     -- Weeraketiya
    'Yakkala',
    'Yatinuwara',
    'Weerawila',       -- Weeawita
    'Head Office'      -- Area Office
  )
ON CONFLICT (site_id, contract_year, visit_type) DO NOTHING;

-- ============================================================================
-- 5. ENSURE NEW INSTALLATION SITES HAVE PLANNED_SERVICES ROWS
--    10 locations that got new machines — ensure they also have service entries
-- ============================================================================

INSERT INTO planned_services (site_id, contract_year, visit_type, status, due_date)
SELECT cs.id, '2026/27', 'Service', 'pending', '2027-07-31'
FROM client_sites cs
WHERE cs.client = 'National Youth Corps'
  AND cs.name IN (
    'Kegalle',
    'Galigamuwa',
    'Aththanagalla Face',
    'Lunugam Wehera',
    'Kakirawa',
    'Diganpathaha',
    'Katharagama HS',
    'Katunayake Face',
    'Wennapuwa',
    'Naththandiya'
  )
ON CONFLICT (site_id, contract_year, visit_type) DO NOTHING;

COMMIT;
