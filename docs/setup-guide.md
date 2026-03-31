# Zoho Books Threshold Monitoring - Setup Guide

## Prerequisites

- Zoho Books US edition (Standard plan or higher for Custom Functions)
- Admin access to your Zoho Books organization
- A Zoho Books API connection configured (for Custom Functions)

## Step 1: Find Your Organization ID

1. Log into Zoho Books
2. Go to **Settings** (gear icon) > **Organization Profile**
3. Your Organization ID is displayed on this page
4. Copy this ID — you'll need it for both scripts

## Step 2: Set Up the Zoho Books Connection

The Deluge scripts use `connection: "zohobooks"` to authenticate API calls. Set this up:

1. Go to **Settings** > **Developer Space** > **Connections**
2. Click **Create Connection**
3. Choose **Zoho Books** as the service
4. Name it: `zohobooks` (must match exactly)
5. Select these scopes:
   - `ZohoBooks.invoices.READ`
   - `ZohoBooks.contacts.READ`
   - `ZohoBooks.vendorpayments.READ`
   - `ZohoBooks.bills.READ`
   - `ZohoBooks.settings.READ`
6. Click **Create and Connect**
7. Authorize when prompted

## Step 3: Configure the Nexus Threshold Monitor

### Create the Scheduled Function

1. Go to **Settings** > **Automation** > **Custom Functions**
2. Click **+ New Custom Function**
3. Name: `Nexus Threshold Monitor`
4. Module: **Invoices** (or General if available)
5. Paste the entire contents of `scripts/nexus-threshold-monitor.deluge`
6. **Edit the configuration section at the top:**
   ```
   orgId = "YOUR_ORG_ID_HERE";        // Replace with your actual org ID
   alertEmail = "your@email.com";       // Where to send alerts
   alertCcEmail = "";                   // Optional CC
   warningPercent = 80;                 // Alert at 80% of threshold
   ```
7. Click **Save**

### Schedule It

1. Go to **Settings** > **Automation** > **Schedules**
2. Click **+ New Schedule**
3. Name: `Weekly Nexus Threshold Check`
4. Function: Select `Nexus Threshold Monitor`
5. Frequency: **Weekly** — Every Monday at 8:00 AM
6. Click **Save**

### Test It

1. Go back to the Custom Function
2. Click **Execute** (or **Run**)
3. Check the execution log for output
4. Verify you receive the email alert (if any thresholds are approached)

## Step 4: Configure the 1099 Vendor Payment Monitor

### Create the Scheduled Function

1. Go to **Settings** > **Automation** > **Custom Functions**
2. Click **+ New Custom Function**
3. Name: `1099 Vendor Payment Monitor`
4. Module: **Vendor Payments** (or General if available)
5. Paste the entire contents of `scripts/vendor-1099-monitor.deluge`
6. **Edit the configuration section at the top:**
   ```
   orgId = "YOUR_ORG_ID_HERE";        // Replace with your actual org ID
   alertEmail = "your@email.com";       // Where to send alerts
   necThreshold = 600.00;              // IRS 1099-NEC threshold
   warningPercent = 83;                // ~$500 of $600
   ```
7. Click **Save**

### Schedule It

1. Go to **Settings** > **Automation** > **Schedules**
2. Click **+ New Schedule**
3. Name: `Weekly 1099 Threshold Check`
4. Function: Select `1099 Vendor Payment Monitor`
5. Frequency: **Weekly** — Every Monday at 9:00 AM
6. Click **Save**

## Step 5: Verify Your Data

### For Nexus Monitoring

Ensure your invoices have accurate **shipping addresses** with state information:

1. Go to a few recent invoices
2. Check that the **Ship To** address includes the state
3. If most invoices don't have shipping addresses, the script falls back to **billing address**
4. If neither has state data, those invoices won't be counted — fix your invoice templates

### For 1099 Monitoring

Ensure your vendors are properly set up:

1. Go to **Contacts** > filter by **Vendors**
2. For each contractor/vendor you pay:
   - Check the **Track 1099** checkbox (under Tax details)
   - Ensure their **Tax ID (TIN/EIN/SSN)** is on file
   - Request a **W-9** if you don't have their TIN

## Important Notes

### Double-Counting Prevention (1099 Script)

The 1099 script pulls data from the **Vendor Payments** endpoint. In Zoho Books:

- If you record bill payments through bills, payments are tracked in **both** the bills and vendor payments modules
- The script currently uses only `vendorpayments` to avoid double-counting
- The bills section is included but commented out — uncomment it ONLY if your workflow doesn't use the vendor payments module

**To check your setup:** Go to Reports > Payments Made. If your vendor payments appear here, the `vendorpayments` endpoint is correct.

### State Name Normalization

Zoho Books may store states as full names ("California") or abbreviations ("CA"). The nexus script handles both formats via a normalization function. If you see states appearing as separate entries in your reports, check your address data consistency.

### API Rate Limits

| Zoho Plan | Daily API Calls |
|-----------|----------------|
| Standard  | 2,500          |
| Professional | 2,500       |
| Premium   | 5,000          |
| Elite     | 10,000         |

Each script execution uses approximately:
- **Nexus monitor:** (total invoices / 200) + 1 API calls
- **1099 monitor:** (total vendors / 200) + (total payments / 200) + 2 API calls

For a business with 5,000 invoices/year and 200 vendors: ~30 API calls per weekly execution. Well within limits.

### Updating Thresholds

**Nexus thresholds** change occasionally. Review the `thresholds` map in the nexus script annually (or when states announce changes). Key states to watch:
- States that recently changed: South Dakota, North Dakota removed transaction thresholds
- States with higher thresholds: California ($500K), Texas ($500K), New York ($500K + 100 txns)

**1099 thresholds** are set by the IRS. The $600 threshold for 1099-NEC has been stable, but the 1099-K threshold for payment platforms has been in transition. Check IRS announcements annually.

## Troubleshooting

### "Connection not found" error
- Verify the connection name is exactly `zohobooks` (case-sensitive)
- Re-authorize the connection under Settings > Developer Space > Connections

### No emails received
- Check the `alertEmail` value in the script
- Check your spam folder
- Run the script manually and check the execution log for `info` messages
- If no thresholds are approached, no email is sent (by design)

### Incorrect state aggregation
- Check invoice shipping/billing addresses for state data consistency
- Look for states stored as "calif" or "Calif." — these won't match
- The normalization handles "California" and "CA" but not all abbreviations

### Script timeout
- Deluge functions have a ~5-10 minute execution timeout
- If you have >25,000 invoices/year, consider splitting by quarter
- Or use the Zoho Books API directly from an external script (Tier 4)

## Next Steps

After running for 2-4 weeks and validating the alerts:

1. **Fine-tune warning percentages** based on your sales velocity
2. **Add Zoho Analytics dashboards** (Tier 2) for visual monitoring
3. **Consider per-customer tracking** if you have large enterprise clients
4. **Blog about your experience** on SatvaSolutions.com
