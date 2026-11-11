-- =====================================================================
-- 0042_update_seylan_bank_services.sql
--
-- Accurate synchronization of Seylan Bank service records from the updated
-- master tracker (Sheet1 of SEYLAN_BANK_SERVICES_DETAILS_YEAR_BY_YEAR_V1_(1).xlsm).
--
-- 1. Client Sites:
--    Ensures all 202 Seylan Bank locations (branches, head office units,
--    and regional area offices) exist in client_sites with verified
--    coordinates in Sri Lanka.
--
-- 2. 2025/26 Pending Services Housekeeping:
--    Any leftover pending services from contract year 2025/26 are closed/skipped
--    (with note: 'Rolled over to 2026/27') so stale 2025/26 records do not
--    appear as overdue duplicates.
--
-- 3. 2026/27 Completed Services (131 branches):
--    Every service completed between 2026-08-01 and 2026-11-17 is recorded as
--    'done' with its exact execution date, Service Call number (where recorded),
--    and cross-referenced notes.
--
-- 4. 2026/27 Pending Services (71 branches):
--    Active Seylan branches not yet serviced in the 2026/27 contract year
--    are set to 'pending', due by 31 Jul 2027, so they appear accurately
--    in the Trip Planner and Service Plan.
--
-- Idempotent: safe to re-run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Ensure all Seylan Bank sites exist with coordinates
-- ---------------------------------------------------------------------
INSERT INTO public.client_sites (client, name, address, place, region, lat, lng)
VALUES
  ('Seylan Bank', 'Northern Area Office (Chunnakam)', NULL, 'Chunnakam', 'North', 9.74593, 80.03340),
  ('Seylan Bank', 'North West II Area Office (Kurunegala)', NULL, 'Kurunegala', 'NW II', 7.48705, 80.36491),
  ('Seylan Bank', 'SME Hub Sub-Office II (Kalubowila)', NULL, 'Kalubowila', 'Sub II', 6.86646, 79.87729)
ON CONFLICT (client, name) DO NOTHING;


-- ---------------------------------------------------------------------
-- 2. Clean up obsolete pending services from 2025/26
-- ---------------------------------------------------------------------
UPDATE public.planned_services
SET status = 'skipped',
    notes = coalesce(notes || '; ', '') || 'Rolled over to 2026/27 contract year.'
WHERE site_id IN (SELECT id FROM public.client_sites WHERE client = 'Seylan Bank')
  AND contract_year = '2025/26'
  AND status = 'pending'
  AND ticket_id IS NULL;


-- ---------------------------------------------------------------------
-- 3. Record all completed services for 2026/27
-- ---------------------------------------------------------------------
INSERT INTO public.planned_services (site_id, contract_year, visit, status, done_at, service_call_number, notes)
SELECT s.id, '2026/27', '1st service', 'done',
       (v.done::date + time '12:00') AT TIME ZONE 'Asia/Colombo',
       v.service_call,
       v.notes
FROM (VALUES
  ('Gothatuwa', '2026-08-03', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 76)'),
  ('Ja-Ela', '2026-08-04', '10526', 'From Seylan service sheet 2026/27 (Sheet1 row 87), SC from 2025_26'),
  ('Katunayake', '2026-08-05', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 107)'),
  ('Kochchikade', '2026-08-05', '10687', 'From Seylan service sheet 2026/27 (Sheet1 row 92), SC from 2025_26'),
  ('Ambalangoda', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 30)'),
  ('Bowatta', '2026-08-06', '10692', 'From Seylan service sheet 2026/27 (Sheet1 row 49), SC from 2025_26'),
  ('Dummalasuriya', '2026-08-06', '10691', 'From Seylan service sheet 2026/27 (Sheet1 row 63), SC from 2025_26'),
  ('Giriulla', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 69)'),
  ('Hettipola', '2026-08-06', '10693', 'From Seylan service sheet 2026/27 (Sheet1 row 78), SC from 2025_26'),
  ('Hikkaduwa', '2026-08-06', '10704', 'From Seylan service sheet 2026/27 (Sheet1 row 79), SC from 2025_26'),
  ('Karapitiya', '2026-08-06', '10703', 'From Seylan service sheet 2026/27 (Sheet1 row 111), SC from 2025_26'),
  ('Koggala', '2026-08-06', '10702', 'From Seylan service sheet 2026/27 (Sheet1 row 98), SC from 2025_26'),
  ('Kuliyapitiya', '2026-08-06', '10690', 'From Seylan service sheet 2026/27 (Sheet1 row 118), SC from 2025_26'),
  ('Kurunegala 1', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 99)'),
  ('Kurunegala 2', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 100)'),
  ('Marandagahamula', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 121)'),
  ('Minuwangoda', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 129)'),
  ('Narammala', '2026-08-06', '10527', 'From Seylan service sheet 2026/27 (Sheet1 row 149), SC from 2025_26'),
  ('Negombo', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 144)'),
  ('Nittambuwa', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 146)'),
  ('North West Area Office (Negombo)', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 200)'),
  ('North West II Area Office (Kurunegala)', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 201)'),
  ('Pannala', '2026-08-06', '10689', 'From Seylan service sheet 2026/27 (Sheet1 row 153), SC from 2025_26'),
  ('Veyangoda', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 183)'),
  ('Warakapola', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 188)'),
  ('Yakkala', '2026-08-06', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 194)'),
  ('Rajagiriya', '2026-08-19', '10752', 'From Seylan service sheet 2026/27 (Sheet1 row 169), SC from 2025_26'),
  ('Thalawathugoda', '2026-08-19', '10753', 'From Seylan service sheet 2026/27 (Sheet1 row 179), SC from 2025_26'),
  ('Dankotuwa', '2026-08-24', '10754', 'From Seylan service sheet 2026/27 (Sheet1 row 61), SC from 2025_26'),
  ('Katuneriya', '2026-08-24', '10756', 'From Seylan service sheet 2026/27 (Sheet1 row 115), SC from 2025_26'),
  ('Kegalle', '2026-08-24', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 97)'),
  ('Mawanella', '2026-08-24', '10531', 'From Seylan service sheet 2026/27 (Sheet1 row 142), SC from 2025_26'),
  ('Pallekele', '2026-08-24', '10534', 'From Seylan service sheet 2026/27 (Sheet1 row 159), SC from 2025_26'),
  ('Peradeniya', '2026-08-24', '10533', 'From Seylan service sheet 2026/27 (Sheet1 row 163), SC from 2025_26'),
  ('Wennappuwa', '2026-08-24', '10755', 'From Seylan service sheet 2026/27 (Sheet1 row 191), SC from 2025_26'),
  ('Dam Street', '2026-09-08', '10765', 'From Seylan service sheet 2026/27 (Sheet1 row 62), SC from 2025_26'),
  ('Grandpass', '2026-09-08', '10762', 'From Seylan service sheet 2026/27 (Sheet1 row 75), SC from 2025_26'),
  ('Kotahena', '2026-09-08', '10763', 'From Seylan service sheet 2026/27 (Sheet1 row 114), SC from 2025_26'),
  ('Maradana', '2026-09-08', '10766', 'From Seylan service sheet 2026/27 (Sheet1 row 122), SC from 2025_26'),
  ('Old Moor Street', '2026-09-08', '10764', 'From Seylan service sheet 2026/27 (Sheet1 row 152), SC from 2026_27'),
  ('Bambalapitiya', '2026-09-10', '10573', 'From Seylan service sheet 2026/27 (Sheet1 row 37), SC from 2026_27'),
  ('Kollupitiya', '2026-09-10', '10572', 'From Seylan service sheet 2026/27 (Sheet1 row 110), SC from 2025_26'),
  ('Borella', '2026-09-11', '10713', 'From Seylan service sheet 2026/27 (Sheet1 row 44), SC from 2026_27'),
  ('Dehiwala', '2026-09-11', '10576', 'From Seylan service sheet 2026/27 (Sheet1 row 59), SC from 2025_26'),
  ('Gampaha', '2026-09-11', '10770', 'From Seylan service sheet 2026/27 (Sheet1 row 67), SC from 2026_27'),
  ('Ganemulla', '2026-09-11', '10769', 'From Seylan service sheet 2026/27 (Sheet1 row 74), SC from 2025_26'),
  ('Havelock Town', '2026-09-11', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 84)'),
  ('Kadawatha', '2026-09-11', '10768', 'From Seylan service sheet 2026/27 (Sheet1 row 95), SC from 2025_26'),
  ('Kiribathgoda', '2026-09-11', '10767', 'From Seylan service sheet 2026/27 (Sheet1 row 91), SC from 2025_26'),
  ('Mount Lavinia', '2026-09-11', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 128)'),
  ('Soysapura', '2026-09-11', '10574', 'From Seylan service sheet 2026/27 (Sheet1 row 176), SC from 2025_26'),
  ('Kandana', '2026-09-15', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 93)'),
  ('Wattala', '2026-09-15', '10536', 'From Seylan service sheet 2026/27 (Sheet1 row 192), SC from 2025_26'),
  ('Bandaragama', '2026-09-16', '10776', 'From Seylan service sheet 2026/27 (Sheet1 row 39), SC from 2025_26'),
  ('Battaramulla', '2026-09-16', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 46)'),
  ('Godagama', '2026-09-16', '10777', 'From Seylan service sheet 2026/27 (Sheet1 row 68), SC from 2026_27'),
  ('Horana', '2026-09-16', '10775', 'From Seylan service sheet 2026/27 (Sheet1 row 82), SC from 2025_26'),
  ('Kirulapone', '2026-09-16', '10537', 'From Seylan service sheet 2026/27 (Sheet1 row 113), SC from 2025_26'),
  ('Padukka', '2026-09-16', '10778', 'From Seylan service sheet 2026/27 (Sheet1 row 155), SC from 2026_27'),
  ('Pettah', '2026-09-16', '10577', 'From Seylan service sheet 2026/27 (Sheet1 row 157), SC from 2025_26'),
  ('Wellawatte', '2026-09-16', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 186)'),
  ('Colombo Fort', '2026-09-17', '10541', 'From Seylan service sheet 2026/27 (Sheet1 row 50), SC from 2025_26'),
  ('Cinnamon Gardens', '2026-09-18', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 52)'),
  ('Head Office - MSL', '2026-09-18', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 23)'),
  ('Priority Banking Centre', '2026-09-18', '10715', 'From Seylan service sheet 2026/27 (Sheet1 row 154)'),
  ('Union Place', '2026-09-18', '10714', 'From Seylan service sheet 2026/27 (Sheet1 row 182), SC from 2025_26'),
  ('Homagama', '2026-09-21', '10544', 'From Seylan service sheet 2026/27 (Sheet1 row 80), SC from 2025_26'),
  ('Kottawa', '2026-09-21', '10543', 'From Seylan service sheet 2026/27 (Sheet1 row 108), SC from 2025_26'),
  ('Maharagama', '2026-09-21', '10542', 'From Seylan service sheet 2026/27 (Sheet1 row 125), SC from 2025_26'),
  ('Ratnapura', '2026-10-01', '10780', 'From Seylan service sheet 2026/27 (Sheet1 row 170)'),
  ('Uva Sabaragamuwa Area Office', '2026-10-01', '10781', 'From Seylan service sheet 2026/27 (Sheet1 row 199)'),
  ('Avissawella', '2026-10-06', '10783', 'From Seylan service sheet 2026/27 (Sheet1 row 35)'),
  ('Eheliyagoda', '2026-10-06', '10785', 'From Seylan service sheet 2026/27 (Sheet1 row 64)'),
  ('Yatiyantota', '2026-10-06', '10784', 'From Seylan service sheet 2026/27 (Sheet1 row 195)'),
  ('Balangoda', '2026-10-07', '10786', 'From Seylan service sheet 2026/27 (Sheet1 row 36)'),
  ('Bogawantalawa', '2026-10-07', '10787', 'From Seylan service sheet 2026/27 (Sheet1 row 43)'),
  ('Hatton', '2026-10-07', '10788', 'From Seylan service sheet 2026/27 (Sheet1 row 83)'),
  ('Nawalapitiya', '2026-10-08', '10789', 'From Seylan service sheet 2026/27 (Sheet1 row 147)'),
  ('Thalawakele', '2026-10-08', '10790', 'From Seylan service sheet 2026/27 (Sheet1 row 178)'),
  ('Welimada', '2026-10-08', '10791', 'From Seylan service sheet 2026/27 (Sheet1 row 189)'),
  ('Tissamaharama', '2026-10-10', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 180)'),
  ('Batticaloa', '2026-10-12', '10796', 'From Seylan service sheet 2026/27 (Sheet1 row 38)'),
  ('Chenkalady', '2026-10-12', '10795', 'From Seylan service sheet 2026/27 (Sheet1 row 56)'),
  ('Hingurakgoda', '2026-10-12', '10792', 'From Seylan service sheet 2026/27 (Sheet1 row 81)'),
  ('Kaduruwela', '2026-10-12', '10793', 'From Seylan service sheet 2026/27 (Sheet1 row 94)'),
  ('Manampitiya', '2026-10-12', '10794', 'From Seylan service sheet 2026/27 (Sheet1 row 130)'),
  ('Kalawanchikudy', '2026-10-13', '10798', 'From Seylan service sheet 2026/27 (Sheet1 row 119)'),
  ('Kalmunai', '2026-10-13', '10799', 'From Seylan service sheet 2026/27 (Sheet1 row 106)'),
  ('Kattankudy', '2026-10-13', '10797', 'From Seylan service sheet 2026/27 (Sheet1 row 102)'),
  ('Sammanthurai', '2026-10-13', '10800', 'From Seylan service sheet 2026/27 (Sheet1 row 174)'),
  ('Akkaraipattu', '2026-10-14', '10803', 'From Seylan service sheet 2026/27 (Sheet1 row 27)'),
  ('Ampara', '2026-10-14', '10802', 'From Seylan service sheet 2026/27 (Sheet1 row 31)'),
  ('Pothuvil', '2026-10-15', '10804', 'From Seylan service sheet 2026/27 (Sheet1 row 166)'),
  ('Siyambalanduwa', '2026-10-15', '10806', 'From Seylan service sheet 2026/27 (Sheet1 row 175)'),
  ('Monaragala', '2026-10-16', '10808', 'From Seylan service sheet 2026/27 (Sheet1 row 124)'),
  ('Galenbidunuwewa', '2026-10-19', '10814', 'From Seylan service sheet 2026/27 (Sheet1 row 72)'),
  ('Kekirawa', '2026-10-19', '10809', 'From Seylan service sheet 2026/27 (Sheet1 row 101)'),
  ('Anuradhapura', '2026-10-20', '10812', 'From Seylan service sheet 2026/27 (Sheet1 row 32)'),
  ('Eppawala', '2026-10-20', '10810', 'From Seylan service sheet 2026/27 (Sheet1 row 66)'),
  ('Nochiyagama', '2026-10-20', '10811', 'From Seylan service sheet 2026/27 (Sheet1 row 143)'),
  ('Kanthale', '2026-10-21', '10816', 'From Seylan service sheet 2026/27 (Sheet1 row 90)'),
  ('Trincomalee', '2026-10-21', '10818', 'From Seylan service sheet 2026/27 (Sheet1 row 177)'),
  ('Aralaganwila', '2026-10-23', '10821', 'From Seylan service sheet 2026/27 (Sheet1 row 26)'),
  ('Dehiattakandiya', '2026-10-23', '10822', 'From Seylan service sheet 2026/27 (Sheet1 row 60)'),
  ('Head Office - 10th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 10)'),
  ('Head Office - 11th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 11)'),
  ('Head Office - 12th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 12)'),
  ('Head Office - 13th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 13)'),
  ('Head Office - 14th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 14)'),
  ('Head Office - 15th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 15)'),
  ('Head Office - 16th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 16)'),
  ('Head Office - 17th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 17)'),
  ('Head Office - 1st Floor - Millennium Branch', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 1)'),
  ('Head Office - 2nd Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 2)'),
  ('Head Office - 3rd Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 3)'),
  ('Head Office - 4th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 4)'),
  ('Head Office - 5th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 5)'),
  ('Head Office - 6th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 6)'),
  ('Head Office - 7th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 7)'),
  ('Head Office - 8th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 8)'),
  ('Head Office - 9th Floor', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 9)'),
  ('Head Office - Card Centre', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 22)'),
  ('Head Office - CCH Basement', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 18)'),
  ('Head Office - DRV / Mail', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 20)'),
  ('Head Office - Imports', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 21)'),
  ('Head Office - PMD - Basement', '2026-10-26', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 19)'),
  ('Kalubowila', '2026-10-27', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 88)'),
  ('Nawala', '2026-10-27', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 151)'),
  ('Nugegoda', '2026-10-27', '10771', 'From Seylan service sheet 2026/27 (Sheet1 row 150), SC from 2026_27'),
  ('SME Hub Sub-Office II (Kalubowila)', '2026-10-27', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 202)'),
  ('Jaffna', '2026-11-17', NULL, 'From Seylan service sheet 2026/27 (Sheet1 row 86)')
) AS v(site, done, service_call, notes)
JOIN public.client_sites s ON s.client = 'Seylan Bank' AND s.name = v.site
ON CONFLICT (site_id, contract_year, visit) DO UPDATE SET
  status = 'done',
  done_at = EXCLUDED.done_at,
  service_call_number = coalesce(EXCLUDED.service_call_number, public.planned_services.service_call_number),
  notes = EXCLUDED.notes;


-- ---------------------------------------------------------------------
-- 4. Set remaining 2026/27 branches as pending (due 31 Jul 2027)
-- ---------------------------------------------------------------------
INSERT INTO public.planned_services (site_id, contract_year, visit, status, due_by, notes)
SELECT s.id, '2026/27', '1st service', 'pending', DATE '2027-07-31',
       'Due for 2026/27: pending annual service'
FROM public.client_sites s
WHERE s.client = 'Seylan Bank'
  AND s.active
  AND NOT s.is_base
  AND NOT EXISTS (
    SELECT 1 FROM public.planned_services p
    WHERE p.site_id = s.id
      AND p.contract_year = '2026/27'
      AND p.visit = '1st service'
  )
ON CONFLICT (site_id, contract_year, visit) DO NOTHING;


-- ---------------------------------------------------------------------
-- 5. Summary verification
-- ---------------------------------------------------------------------
SELECT s.client,
       count(DISTINCT s.id) AS total_sites,
       count(p.id) FILTER (WHERE p.contract_year = '2026/27' AND p.status = 'done') AS services_done_2026_27,
       count(p.id) FILTER (WHERE p.contract_year = '2026/27' AND p.status = 'pending') AS pending_2026_27,
       count(DISTINCT p.site_id) FILTER (WHERE p.status = 'done') AS sites_with_a_last_service
FROM public.client_sites s
LEFT JOIN public.planned_services p ON p.site_id = s.id
WHERE s.client = 'Seylan Bank'
GROUP BY s.client;
