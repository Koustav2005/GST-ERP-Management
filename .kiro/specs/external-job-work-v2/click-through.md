# External Job Work v2 - click-through script (S1, S2, S3, printed documents)

Run the backend (`cd backend && npm run dev`) and the app on a phone/emulator (the PDF share sheet does not work on web).
Use one company with these users: Management, Accountant, Store Incharge, Project Manager (PM), NPD, Worker.

## 0. Set up once

1. **Management** > *Document Settings*: set the company **Address** and **GSTIN** (e.g. 29...Z5) > Save. The state follows the GSTIN.
   Check *Numbering*: leave DC and Invoice on "app" for now (the Tally case is step 9).
2. **Accountant** > *Customer Master* > *+ Add customer*: name "AKE Engineering", GSTIN 29... (same state), billing address,
   **works address**, email. Add a second customer "Chennai Castings" with a 33... GSTIN (interstate).
3. **Accountant** > *Add To Stock*: make sure a stock item "Shaft" (HSN 8483, pcs) exists.
4. A project manager and a worker exist; you will assign the worker to the project in step 1.9.

## S1 - customer sends its own DC with the material

1.1 **Store** > *Customer Material Inward*. Customer = AKE. "Customer's DC no." = `AKE-118`, date = today. Item: Shaft, qty 100, value per unit 2000. Vehicle, e-way (optional), take a photo. **Save**.
    Expect: "Material received. SE/IN/0001 saved", opens the inward with the item and its photo.
1.2 Try the same again (same DC no. and date): expect a red message and a green button **"Add a receipt to SE/IN/0001 instead"**. Tap it: the *Add receipt* form opens. Enter another truck's date/vehicle and a small item; Save. The inward now shows Truck 1 and Truck 2.
1.3 **PM** > *External Job Work* > tab *Stock awaiting work*. Tick the AKE items (try ticking a Chennai item too: it is refused, "one customer"). **Create work order** > text "hard chrome plating" > Create. Opens SE/WO/0001.
1.4 On the work order: type **Customer PO no.** `PO-77` > Save. (The PM sees no rupee amount anywhere on these screens.)
1.5 **PM** > *Request material for the floor*: pick the worker, quantity 100 (more than available is refused with a clear message) > send.
1.6 **Store** > *External Job Work Outstock*: open the request > Fulfil. Expect issued 100. (Or the **worker** scans the QR: same result, same stock.)
1.7 **PM** > work order > **Mark ready**: quantity 60, attach an inspection report > *Send to Store*. A second Mark ready is refused until Store confirms.
1.8 **Store** > *Confirm Ready*: the notice shows the PM's 60. Change the count to 58 > **Confirm count**. Accounts gets a notification.
1.9 **Accountant** > *Dispatch (External)* > tab *Ready for dispatch*: SE/WO/0001 with 58 pcs, no blockers > **Prepare dispatch**.
    Enter quantity 58, **Job charge** 112000, GST rate **18%** (dropdown), SAC stays 998875. The preview fills in live:
    place of supply Karnataka (29), CGST 9% + SGST 9%, invoice total, dispatch total; "E-way bill REQUIRED: above 50,000".
    **Save & issue...** > leave both numbers blank (app source) > type the 12-digit e-way bill > **Issue**.
    Expect: "Challan SE/DC/00xx and invoice SE/INV/2627/00xx created", the dispatch page shows both.
1.10 On the dispatch page: **Delivery challan PDF** and **Tax invoice PDF** open the share sheet. Check the PDFs (section P below).
1.11 Back on the work order: Returned 58, status *Partially dispatched*. Repeat 1.7-1.10 for the remaining 42 (e-way again). The last dispatch closes the inward and the work order.
1.12 **Accountant** > the dispatch > **Cancel this dispatch...** with a reason: the quantities return to the work order; both numbers stay used (the next dispatch gets new numbers); the invoice PDF is stamped CANCELLED.

## S2 - a supplier ships the material for the customer; the customer's DC comes later

2.1 **Store** > *Customer Material Inward*. Customer = AKE. Switch on **Sent by a third party**: supplier name, supplier DC no. (customer DC fields are now optional - leave them blank). Item Shaft 50 at 2000. Save.
2.2 Open the inward: orange box "Customer DC still to come". Under *Acknowledgment to the customer*: **Share / copy** (share sheet) and **Email** (opens the mail app with the text).
2.3 **PM** creates the work order (step 1.3) and records `PO-88`; issue to the floor, mark ready, Store confirms (steps 1.5-1.8).
2.4 **Accountant** > *Dispatch* > *Ready for dispatch*: the work order shows a red box **"Customer DC for SE/IN/0002 is not attached"**. *Prepare dispatch*, fill it in: the preview lists the same blocker and **Save & issue is disabled**; Save draft is refused too.
2.5 **Store** > *Customer Material List* > tab *Customer DC pending* > the inward > **Attach customer DC** (number + date). The warning box disappears.
2.6 **Accountant** repeats 2.4: no blocker now, the draft saves, **Issue...** works. Challan line shows the customer DC number.
2.7 Variation: leave the PM's PO number empty on another work order: the blocker "Customer PO number is missing" appears instead.

## S3 - enquiry > quotation > customer PO > job waiting for material > inward against the job

3.1 **Management** > *Enquiry* > upload an enquiry PDF. Send to NPD; NPD uploads a quotation; Management reviews/approves it.
3.2 *Customer action > Final Accept*: the **Choose Work Type** box opens. Pick **External Job Work**: a **Customer** dropdown appears (required). Choose AKE. Attach the customer PO PDF > Confirm.
    Expect: no duplicate project; one project + work order SE/WO/00xx in status *Awaiting material* with no PM.
3.3 **Management/NPD**: open the project and assign the **PM** (the work order's PM follows; the PM gets a notification). Add the worker to the project.
3.4 **NPD or PM** > *External Job Work* > Work orders > the new job: under *Waiting for the customer's material* type the expected-material note > Save.
3.5 **Store** > *Customer Material Inward*: switch on **Against an open job**, pick the SE/WO job (the customer is fixed by the job). Customer DC `AKE-120`, item Shaft 30 at 2000 > Save.
    Expect: the job moves from *Awaiting material* to *Open*; the PM is notified "Customer material received".
3.6 PM records the PO number, requests the material, marks ready; Store confirms; Accountant dispatches (steps 1.4-1.10).
3.7 Cleanup check: *External Reports* > *Work orders*: all three jobs listed with the right status; *Inside factory* shows only what is still inside.

## 9. Tally numbers (Management, then Accountant)

9.1 **Management** > *Document Settings* > Delivery challan: switch **Numbers come from Tally** on; same for Tax invoice.
9.2 **Accountant** > a dispatch > *Issue...*: both number boxes now say "Required". Leave them empty > refused. Type `TD-001` and `TI-001` > issued with exactly those numbers.
9.3 Issue another dispatch with `TD-001` again: refused ("already exists"). A number over 16 characters or with spaces is refused.

## P. Check the printed documents (open the PDFs from the dispatch page)

**Delivery Challan** shows: company name, address and GSTIN at the top; DELIVERY CHALLAN; "Job work - return after hard chrome plating";
DC no./date; our work order and the customer's PO no.; **Customer DC ref** (AKE-118 dt. ...); vehicle; e-way; customer name, **works address**, GSTIN;
table Sl / Description / HSN / Qty / Unit / Customer DC / Value; total value of goods; *no GST anywhere*; signature block.
**Tax Invoice** shows: TAX INVOICE; invoice no./date (16 characters, e.g. SE/INV/2627/0001); our GSTIN; customer **billing** address and GSTIN;
**Place of Supply: Karnataka (29)**; our DC no. and the customer PO no.; SAC 998875; taxable value = the job charge only;
CGST 9% + SGST 9% (same state) or IGST 18% (Chennai Castings: Tamil Nadu (33)); invoice total; **amount in words**; signature block.
Reference numbers for the Rs 2,00,000 material + Rs 1,12,000 job charge case: CGST 10,080.00 + SGST 10,080.00, invoice 1,32,160.00, dispatch total 3,32,160.00.
**Internal DC**: *Job Work > Outward* > open any delivery challan > **Print / share delivery challan (PDF)**: same style, "SEND TO (JOB WORKER)" with the vendor.

## R. Role checks while you are at it

- PM: never sees a rupee amount (work order, ready notices, reports, material list).
- Store: sees the value of the customer's material (inward, reports) but no job charge, GST or invoice total; can print the challan, not the invoice (the button is absent; the server says 403).
- Reports (*External Reports*): Inside factory, Stock as of a date (try yesterday and today), Open customer DCs, Work orders, Invoices (Accountant/Management only; cancelled invoices are listed but not totalled).
