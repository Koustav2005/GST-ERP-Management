-- Script to delete all data related to SVCE company
-- This will preserve the database structure but remove all SVCE-related data

BEGIN;

-- First, get the company_id for SVCE
-- Assuming the company name is 'SVCE' or similar
DO $$
DECLARE
    svce_company_id INTEGER;
BEGIN
    -- Find SVCE company ID
    SELECT id INTO svce_company_id FROM companies WHERE name ILIKE '%SVCE%' LIMIT 1;
    
    IF svce_company_id IS NOT NULL THEN
        RAISE NOTICE 'Found SVCE company with ID: %', svce_company_id;
        
        -- Delete in order to respect foreign key constraints
        
        -- 1. Delete material usage reports
        DELETE FROM material_usage_reports WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id);
        
        -- 2. Delete project expenses
        DELETE FROM project_expenses WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id);
        
        -- 3. Delete sales orders
        DELETE FROM sales_orders WHERE inventory_id IN (SELECT id FROM sales_inventory WHERE company_id = svce_company_id);
        
        -- 4. Delete sales inventory
        DELETE FROM sales_inventory WHERE company_id = svce_company_id;
        
        -- 5. Delete allocation tasks
        DELETE FROM allocation_tasks WHERE store_request_id IN (SELECT id FROM store_requests WHERE company_id = svce_company_id);
        
        -- 6. Delete store request items
        DELETE FROM store_request_items WHERE request_id IN (SELECT id FROM store_requests WHERE company_id = svce_company_id);
        
        -- 7. Delete store requests
        DELETE FROM store_requests WHERE company_id = svce_company_id;
        
        -- 8. Delete barcodes
        DELETE FROM barcodes WHERE company_id = svce_company_id;
        
        -- 9. Delete inventory
        DELETE FROM inventory WHERE company_id = svce_company_id;
        
        -- 10. Delete materials detail
        DELETE FROM materials_detail WHERE company_id = svce_company_id;
        
        -- 11. Delete bid items (via bids)
        DELETE FROM bid_items WHERE bid_id IN (SELECT id FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = svce_company_id));
        
        -- 12. Delete vendor bids
        DELETE FROM vendor_bids WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = svce_company_id);
        
        -- 13. Delete demand items
        DELETE FROM demand_items WHERE demand_id IN (SELECT id FROM vendor_demands WHERE company_id = svce_company_id);
        
        -- 14. Delete vendor demands
        DELETE FROM vendor_demands WHERE company_id = svce_company_id;
        
        -- 15. Delete requirement items
        DELETE FROM requirement_items WHERE requirement_id IN (SELECT id FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id));
        
        -- 16. Delete requirements
        DELETE FROM requirements WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id);
        
        -- 17. Delete project revisions
        DELETE FROM project_revisions WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id);
        
        -- 18. Delete bill of materials
        DELETE FROM bill_of_materials WHERE project_id IN (SELECT id FROM projects WHERE company_id = svce_company_id);
        
        -- 19. Delete projects
        DELETE FROM projects WHERE company_id = svce_company_id;
        
        -- 20. Delete notifications for users in this company
        DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE company_id = svce_company_id);
        
        -- 21. Delete users (except admin if needed)
        DELETE FROM users WHERE company_id = svce_company_id;
        
        -- 22. Finally, delete the company itself
        DELETE FROM companies WHERE id = svce_company_id;
        
        RAISE NOTICE 'Successfully deleted all SVCE company data';
    ELSE
        RAISE NOTICE 'SVCE company not found';
    END IF;
END $$;

COMMIT;

-- Verify deletion
SELECT 'Companies remaining:' as info, COUNT(*) as count FROM companies;
SELECT 'Users remaining:' as info, COUNT(*) as count FROM users;
SELECT 'Projects remaining:' as info, COUNT(*) as count FROM projects;
