# AASAN PETROL — HCI prototype (Expo + Supabase)

AASAN PETROL is a Pakistani fuel-wallet HCI prototype designed for riders, drivers and employees who may have limited literacy or confidence with technology. The UI uses large buttons, clear icons, Roman-Urdu voice guidance, GPS-based nearby-station detection, a six-digit PIN lock, wallet allowance, top-up requests, transaction history, camera evidence, and meter-photo OCR.

## What is implemented

- One-time registration with full name, mobile number, email, company, account type, password, and a six-digit PIN.
- A clear account-created / check-your-email screen. The user can return to the login screen instead of being left on a dead button.
- Email/password is used for account creation and account recovery only. Returning users can unlock an existing Supabase session with their six-digit PIN. If they forget the PIN or use a new device, email/password recovery lets them set a new local PIN.
- PIN hash is saved on the device, not in the Supabase profile. Native devices use SecureStore; browser preview stores the hash in browser storage. The PIN is not a replacement for server authentication and is not shared across devices.
- Biometric login is intentionally not shown.
- Maroon-and-gold UI, large icon-led actions, visible back/cancel controls, and voice guidance toggles.
- Wallet balance comes from the active Supabase allowance. A top-up opens a modal with a close button and creates a **request**. It does not add money automatically. The employer/admin must review it.
- Monthly and previous-month fuel usage is calculated from transaction records. Litres are shown only when a meter reading was supplied/reviewed; the app does not invent litres.
- GPS requests the device's location and selects the nearest registered station when it is within 150 metres. If it cannot detect a station, the user can choose a registered station manually. GPS cannot identify a real pump unless verified station coordinates are in Supabase.
- Fuel amount input is capped at the currently available allowance. The app asks the user to confirm with Haan / Nahi before starting.
- Shop items are selected with plus/minus controls. Checkout uses the same allowance balance and creates a transaction record.
- Before/after dispenser photos upload to a private Supabase Storage bucket. OCR extracts text on the browser using Tesseract.js and on native Android using ML Kit; extracted values are shown for user review because OCR can misread numbers. The raw OCR text, amount, litres, price per litre, and whether the user confirmed the values are recorded in `meter_readings`. Shop item names/prices are loaded from the database catalogue and the checkout RPC recalculates the total server-side.
- Transaction history displays fuel and shop records and their review status.
- Supabase Row Level Security (RLS) and database functions enforce approval and allowance checks. A client-side button cannot approve its own account.

## Important limitations — read before presenting this as a real payment system

- This is an HCI / coursework prototype, not a production payment or fuel-dispensing system. It does **not** communicate with a petrol dispenser or payment terminal, and it does not send money to a station.
- The app records and reserves company allowance in the database. A photo is evidence for review, not proof that the exact quantity of petrol entered the vehicle.
- OCR is best-effort. The user must verify the extracted amount/litres. Do not automatically treat OCR output as authoritative financial data.
- A fuel transaction reserves the allowance when the user confirms. If the user abandons the camera/evidence steps, a trusted admin must reconcile the reserved amount. The app intentionally does not provide a client-side refund or self-approval control.
- Top-up requests remain pending until an employer/admin processes them. Approval must be followed by a trusted update to the allowance; the app does not credit money just because a request was submitted.
- Employer/admin approval is performed through a controlled trusted process, not by the driver. Do not expose the Supabase service-role key in the app.
- Native OCR uses `@react-native-ml-kit/text-recognition`, which requires a custom Expo development build; it does not run in Expo Go. Browser preview uses Tesseract.js.
- Voice availability and Urdu pronunciation depend on the browser/device's installed speech voices. Some devices may pronounce Roman Urdu imperfectly.
- Do not use fake station records for a real-world demonstration. Use only verified stations and coordinates.

## 1. Install the tools

1. Install Node.js LTS: https://nodejs.org/
2. Install VS Code.
3. Create or use your Supabase project.
4. Extract the ZIP and open the `aasan-petrol` folder itself in VS Code.

## 2. Configure Supabase

### Existing project

If you already ran `001_initial_schema.sql`, **do not run it again just to get the new features**. Run the new migration below.

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/migrations/002_hci_wallet_topups_shop_ocr.sql` in VS Code.
3. Copy the entire file into SQL Editor and click **Run**.
4. Check **Table Editor** for `wallet_topup_requests`, `meter_readings`, and `shop_catalog`.
5. Confirm `fuel_transactions` now has `transaction_category` and `transaction_details` columns.
6. Under **Authentication → Providers**, enable Email.
7. Under **Authentication → URL Configuration**, allow the browser URL you use for testing (for example `http://localhost:8081/**` or the actual Expo web URL with a matching wildcard). Email verification must redirect back to an allowed URL. For a native deep link, allow `aasanpetrol://auth/callback` as well.

### New Supabase project

Run `001_initial_schema.sql` first, then run `002_hci_wallet_topups_shop_ocr.sql`. Review SQL output for errors after each migration.

## 3. Configure `.env`

1. Copy `.env.example` to a new file named `.env` in the project root.
2. Fill in your project URL and **publishable/anon key**.
3. Never use the `service_role` or secret key in `.env` for the mobile app.
4. Stop Expo with `Ctrl+C` and restart it after changing `.env`.

Example format:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
```

## 4. Install and preview in a browser

Open a terminal in the folder containing `package.json` and run:

```powershell
npm install
npx expo start --web
```

Open the local URL Expo prints. Camera and GPS in the browser require browser permissions; camera access generally requires `localhost` or HTTPS. The first browser OCR scan downloads the Tesseract English OCR model and may take a little while.

If Expo reports missing web dependencies, run:

```powershell
npx expo install react-dom react-native-web @expo/metro-runtime
```

## 5. Run on Android

For a quick UI-only Expo Go test, run `npx expo start` and scan the QR code. However, the native OCR library is not included in Expo Go. To test the complete Android OCR path, create a development build after installing Android Studio / Android SDK:

```powershell
npx expo prebuild
npx expo run:android
```

Native package installation may require resolving Android build-tool issues on your machine. This project has not been built on your specific device, so do not assume an APK is already produced.

## 6. First test account: verification and approval

1. Register using a test email address, phone number, company name, password and six-digit PIN.
2. The app should show an account-created message and ask you to check the email.
3. Open the verification link. It must return to an allowed URL. Return to the app and enter the six-digit PIN.
4. The database profile starts as `pending`; the app shows that it is waiting for company approval.
5. As a trusted project admin, inspect the profile:

```sql
select id, full_name, phone, role, employer_name, approval_status
from public.profiles
order by created_at desc;
```

Approve only the test account you intend to use:

```sql
update public.profiles
set approval_status = 'approved'
where id = 'PASTE-TEST-USER-UUID-HERE';
```

The user may need to refresh/reopen the app to see the updated status.

## 7. Prepare an approved employee / driver test

### Add a small test allowance

```sql
insert into public.allowances
  (employee_id, limit_amount_pkr, remaining_amount_pkr, period_start, period_end, is_active)
values
  ('PASTE-EMPLOYEE-UUID-HERE', 2500, 2500, current_date,
   (date_trunc('month', current_date) + interval '1 month - 1 day')::date, true);
```

### Approve the employee's test vehicle

An approved employee can add a vehicle from the app. Then use SQL to find it:

```sql
select id, employee_id, registration_number, approved_by_employer
from public.vehicles
order by created_at desc;
```

Approve the intended test vehicle:

```sql
update public.vehicles
set approved_by_employer = true
where id = 'PASTE-TEST-VEHICLE-UUID-HERE';
```

For a driver account, a trusted admin must also approve the matching row in `driver_authorisations` after the employee requests the driver. Do not skip this authorization check.

### Add verified test station coordinates

The GPS feature needs real coordinates. Replace these example values with a station you have permission to use for the prototype:

```sql
insert into public.stations
  (name, address, latitude, longitude, integration_level, is_active)
values
  ('Verified test station', 'Verified station address', 24.8607, 67.0011, 'manual', true);
```

The coordinates above are only an example near Karachi, not a claim that a specific petrol pump is there. Replace them with the exact coordinates of your test station. Station matching uses a 150-metre radius.

## 8. Approve a top-up request (trusted admin only)

The user submits a request in the app. It stays pending. Inspect requests:

```sql
select id, requested_by, employee_id, vehicle_id, requested_amount_pkr, status, note, created_at
from public.wallet_topup_requests
order by created_at desc;
```

For a controlled test, copy the request ID, `employee_id` and amount, verify the request manually, then update the active allowance and request status in a trusted admin SQL session. Do not grant these update permissions to the client app. For example, after checking that the request is still pending, replace the UUIDs and amount below with the values you verified:

```sql
-- Trusted admin only. Use the amount shown on the specific request.
update public.allowances
set limit_amount_pkr = limit_amount_pkr + 1000,
    remaining_amount_pkr = remaining_amount_pkr + 1000
where employee_id = 'PASTE-EMPLOYEE-UUID-HERE' and is_active = true;

update public.wallet_topup_requests
set status = 'approved', reviewed_at = now(), reviewed_by = 'PASTE-ADMIN-PROFILE-UUID-HERE',
    review_note = 'Approved for test'
where id = 'PASTE-TOPUP-REQUEST-UUID-HERE' and status = 'pending';
```

Run this only after verifying the requested amount is exactly Rs. 1,000 in the example above. For any other amount, change both `1000` values. Use a trusted admin profile UUID for `reviewed_by`; do not run this as the rider. In a production system, approval and balance credit should be one atomic audited server-side operation.

## 9. Test checklist

- [ ] Registration validates required fields, password length and matching six-digit PINs.
- [ ] Successful registration displays a confirmation screen; it does not silently jump to the dashboard.
- [ ] Email verification returns to an allowed URL and the PIN login unlocks the active session.
- [ ] No biometric option or fake biometric success is shown.
- [ ] A pending/rejected profile cannot refuel.
- [ ] PIN errors are visible and the PIN is not saved as plain text.
- [ ] Wallet amount comes from the active allowance in Supabase, not a hard-coded sample value.
- [ ] Top-up modal has a close button; submitting it creates a pending request without adding money.
- [ ] Monthly / previous-month usage comes from recorded transactions.
- [ ] GPS picks the nearest registered station only when coordinates and device location are available.
- [ ] Fuel amount is capped at available allowance and a Haan/Nahi confirmation appears.
- [ ] Fuel transactions reserve allowance atomically and appear in history.
- [ ] Shop purchases reserve the same allowance and appear in history.
- [ ] Meter photos upload to the private `fuel-evidence` bucket.
- [ ] OCR text and reviewed readings appear in `meter_readings`.
- [ ] OCR values are checked by a human; a wrong OCR reading is not treated as authoritative.
- [ ] A transaction above the remaining allowance is rejected by the database.
- [ ] Camera/GPS denial and network failures do not show fake success.

## Folder structure

```text
aasan-petrol/
├── App.tsx
├── app.json
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── components/CameraCapture.tsx
│   ├── lib/{supabase.ts,theme.ts,types.ts,ui.tsx}
│   ├── screens/{AuthScreens.tsx,MainScreens.tsx}
│   └── services/{auth.ts,data.ts,device.ts,pin.ts,ocr.web.ts,ocr.native.ts}
└── supabase/
    ├── migrations/001_initial_schema.sql
    ├── migrations/002_hci_wallet_topups_shop_ocr.sql
    └── seed_example.sql
```

## Troubleshooting

- **Expo says web support dependencies are missing:** run the `npx expo install react-dom react-native-web @expo/metro-runtime` command above.
- **Registration succeeds but no email arrives:** check Supabase Auth email provider, email delivery settings, spam folder and allowed redirect URLs.
- **PIN is correct but login says verify email / recover account:** email confirmation has not created a current session yet. Open the verification link first. Account recovery is available if the session expired.
- **Top-up request screen errors:** confirm migration `002_hci_wallet_topups_shop_ocr.sql` ran successfully.
- **No wallet balance:** a trusted admin must create an active allowance for the employee. Do not add a fake balance in the client.
- **No nearby station:** add a verified active station with accurate latitude/longitude and grant browser/device location permission.
- **Vehicle is not approved:** trusted employer/admin approval is required before refuelling.
- **OCR fails on web:** ensure the camera photo is sharp and well lit. You can enter the values manually after the raw OCR text fails to parse.
- **OCR fails on Android Expo Go:** expected; use a development build to include the native ML Kit module.
- **Upload fails:** check that the private `fuel-evidence` bucket and RLS/storage policies from migration 001 are present. Never disable RLS or make the evidence bucket public to bypass an error.
