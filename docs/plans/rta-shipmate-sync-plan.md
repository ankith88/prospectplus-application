# RTA / ShipMate Access 3-Step Sync Implementation Plan

This plan documents the 3-step RTA / ShipMate API integration for Admin users when a lead is in a **ShipMate Trial** or a **Customer Signed Up** requiring ShipMate access.

---

## Overview & API Specifications

### API Credentials & Headers
* **API Key Header (`x-api-key`):** `XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj`
* **Content-Type & Accept:** `application/json`

### Endpoints
1. **Step 1:** `POST https://mpns.protechly.com/new_staff`
2. **Step 2:** `POST https://mpns.protechly.com/new_customer`
3. **Step 3:** `POST https://mpns.protechly.com/customer_update`

### Target Audience & Status Eligibility
* **Authorization:** Admin users only (`isAdmin` / `isAdminUser`).
* **Eligible Statuses:**
  1. Lead trialing ShipMate (`Trialing ShipMate`, `ShipMate Free Trial Active`).
  2. Customer signed up / won (`Won`, `Signed`, `Signed Up`, `Customer`, or Company profile).

---

## 3-Step Sequential Sync Workflow & Payload Value Mapping

### Step 1: Create Staff Member User (`https://mpns.protechly.com/new_staff`)

Creates the staff/contact user account for ShipMate access.

* **Method:** `POST`
* **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": "XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj"
  }
  ```

* **Payload Structure (`userJSON`):**
  ```json
  {
    "customer_ns_id": "<custId>",
    "first_name": "<firstName>",
    "last_name": "<lastName>",
    "email": "<email>",
    "phone": "<phone>"
  }
  ```

* **Value Sources:**
  | Field | Sourced From | Fallback |
  | :--- | :--- | :--- |
  | `customer_ns_id` | `(lead as any).internalid` | `lead.id` (lead document ID) |
  | `first_name` | `selectedContact.firstName` | `selectedContact.name.split(' ')[0]` |
  | `last_name` | `selectedContact.lastName` | `selectedContact.name.split(' ').slice(1).join(' ')` |
  | `email` | `selectedContact.email` | `lead.customerServiceEmail` or `lead.email` |
  | `phone` | `selectedContact.phone` | `lead.customerPhone` or `lead.phone` |

---

### Step 2: Create Customer (`https://mpns.protechly.com/new_customer`)

Initializes the customer record in RTA / ShipMate.

* **Method:** `POST`
* **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": "XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj"
  }
  ```

* **Payload Structure (`customerJSON`):**
  ```json
  {
    "ns_id": "<custId>"
  }
  ```

* **Value Sources:**
  | Field | Sourced From | Fallback |
  | :--- | :--- | :--- |
  | `ns_id` | `(lead as any).internalid` | `lead.id` (lead document ID) |

---

### Step 3: Update Customer Details & Pricing/Suburb Mappings (`https://mpns.protechly.com/customer_update`)

Syncs customer address details, pricing table, and depot driver suburb mappings.

* **Method:** `POST`
* **Headers:**
  ```json
  {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": "XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj"
  }
  ```

* **Payload Structure:**
  ```json
  {
    "customer_ns_id": "<custId>",
    "credit_card_payment": false,
    "account": "mp_customer",
    "default_email": "<email>",
    "default_phone": "<phone>",
    "default_product_id": "",
    "addresses": [
      {
        "suburb": "<suburb>",
        "state": "<state>",
        "postcode": "<postcode>",
        "address1": "<address1>",
        "latitude": "<latitude>",
        "longitude": "<longitude>",
        "visible": true,
        "default": true
      }
    ],
    "pricing_table": [ ... ],
    "suburb_mapping": [ ... ]
  }
  ```

* **Value Sources:**
  | Field | Sourced From | Fallback |
  | :--- | :--- | :--- |
  | `customer_ns_id` | `(lead as any).internalid` | `lead.id` (lead document ID) |
  | `credit_card_payment` | Hardcoded `false` | `false` |
  | `account` | Hardcoded `"mp_customer"` | `"mp_customer"` |
  | `default_email` | `selectedContact.email` | `lead.customerServiceEmail` or `lead.email` |
  | `default_phone` | `selectedContact.phone` | `lead.customerPhone` or `lead.phone` |
  | `default_product_id` | Hardcoded `""` | `""` |
  | `addresses[0].suburb` | `lead.city` | `lead.address?.city` or `""` |
  | `addresses[0].state` | `(lead.state \|\| lead.address?.state \|\| "").toUpperCase()` | `""` |
  | `addresses[0].postcode` | `lead.zip` | `lead.address?.zip` or `""` |
  | `addresses[0].address1` | `lead.address1 \|\| lead.street` | `lead.address?.street \|\| lead.address?.address1` or `""` |
  | `addresses[0].latitude` | `String(lead.latitude \|\| lead.lat \|\| lead.address?.lat \|\| "")` | `""` |
  | `addresses[0].longitude` | `String(lead.longitude \|\| lead.lng \|\| lead.address?.lng \|\| "")` | `""` |
  | `pricing_table` | `lead.pricing_table` or generated via `generatePricingTable(lead.chosenPremiumPlan || 'Merchant', lead.chosenExpressPlan || 'Merchant')` | `DEFAULT_PREMIUM_PRICING` |
  | `suburb_mapping` | `lead.suburb_mapping` or generated via `generateSuburbMapping(lead, franchisee)` | Formatted courier array |

---

## Architectural Changes & Code Files

### 1. Server Proxy Action
* **New File:** [`src/services/rta-proxy.ts`](file:///Users/ankithravindran/Development/Antigravity/prospectplus-application/src/services/rta-proxy.ts)
* **Function:** `syncShipMateAccessToRta({ lead, contact, franchisee })`
* Executes the 3 POST requests sequentially (`/new_staff`, `/new_customer`, `/customer_update`) and updates Firestore document metadata (`shipMateSyncedAt`, `shipMateSyncStatus`).

### 2. UI Components
* **New File:** [`src/components/shipmate-sync-dialog.tsx`](file:///Users/ankithravindran/Development/Antigravity/prospectplus-application/src/components/shipmate-sync-dialog.tsx)
  * Modal for Admin users to select/confirm the contact requiring ShipMate access.
* **Modified File:** [`src/components/lead-profile.tsx`](file:///Users/ankithravindran/Development/Antigravity/prospectplus-application/src/components/lead-profile.tsx)
  * Adds **"Sync ShipMate Access"** button visible to Admin users when lead is in ShipMate Trial or Signed Up Customer status.

---

## Verification Steps for Future Implementation
1. Run `npm run build` to ensure TypeScript compilation without errors.
2. Log in as an Admin user and navigate to a lead trialing ShipMate or a Signed Customer profile.
3. Open the sync modal, select a contact, and click **Confirm & Sync**.
4. Confirm network calls to `/new_staff`, `/new_customer`, and `/customer_update` complete sequentially with `200 OK`.
