# ABSL Helpdesk Starter

This is a mobile-responsive starter for Automated Barcode Solutions Pvt Ltd.
It follows the uploaded sequence diagrams as requirements:

- customer registration and approval
- role dashboards for customer, agent, technician, and admin
- ticket creation with photo, voice note, callback, comments, and status changes
- technician assignment and inventory use
- atomic inventory decrement in Supabase
- realtime-ready ticket/comment data
- notification queue, retry, and dead-letter handling
- inventory CSV cleanup and migration

## 1. Open the App First

Open `index.html` in a browser. It runs in demo mode immediately.

Edit `config.js` only after Supabase is ready:

```js
window.ABSL_SUPABASE = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

## 2. Create Supabase Project

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Copy everything from:

```text
supabase/migrations/0001_initial_schema.sql
```

4. Run the SQL.
5. Create these Storage buckets:

```text
ticket-photos
ticket-voice-notes
inventory-csv-imports
```

6. Enable Realtime for:

```text
tickets
ticket_comments
notifications
```

## 3. App Roles

The app has four role dashboards:

- Customer: create tickets, view own tickets, reply, request callback
- Agent: view ticket queue, update status, comment, assign technician
- Technician: view assigned jobs, press Work button, consume inventory
- Admin: approve/reject users, increase company limits, retry notifications

## 4. Important Supabase Functions

The migration includes:

```sql
public.change_ticket_status(ticket_id, new_status, expected_version)
```

Use this to prevent two agents from overwriting the same ticket.

```sql
public.consume_inventory(ticket_id, inventory_item_id, quantity)
```

Use this when a technician presses the Work button. It locks the inventory row
and stops stock from going below zero.

## 5. Notification Sending

The Edge Function is here:

```text
supabase/functions/send-notifications/index.ts
```

Set these Supabase secrets:

```bash
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set FROM_EMAIL=helpdesk@automatedbarcode.net
```

Deploy it:

```bash
supabase functions deploy send-notifications
```

Run it from a cron job every few minutes. It sends pending email notifications,
retries failed ones, and moves permanently failed records to `dead_letter`.

## 6. Inventory CSV Cleanup

Clean old inventory spreadsheets before importing:

```bash
node scripts/import_inventory_csv.js old_inventory.csv cleaned_inventory.csv
```

It creates:

```text
cleaned_inventory.csv
cleaned_inventory_rejects.csv
```

Import `cleaned_inventory.csv` into `inventory_items`.

## 7. Git Steps

Initialize the project:

```bash
git init
git add .
git commit -m "Initial ABSL helpdesk starter"
```

Create GitHub repository, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/absl-helpdesk.git
git branch -M main
git push -u origin main
```

Use branches for each module:

```bash
git checkout -b feature/auth
git checkout -b feature/ticketing
git checkout -b feature/admin-approval
git checkout -b feature/technician-inventory
git checkout -b feature/notifications
git checkout -b feature/mobile-ui
```

After every completed feature:

```bash
git add .
git commit -m "Describe the completed feature"
git push
```

## 8. Suggested Build Order

1. Supabase schema
2. Authentication
3. Registration and approval
4. Customer ticket creation
5. File upload for photos and voice notes
6. Customer ticket detail and comments
7. Agent dashboard
8. Status update and conflict protection
9. Technician dashboard
10. Inventory Work button
11. Admin approval screens
12. Company account limits
13. Notification worker
14. Realtime subscriptions
15. CSV import tool
16. Mobile testing

