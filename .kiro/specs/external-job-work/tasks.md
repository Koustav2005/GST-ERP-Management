# Implementation Plan: External Job Work Feature

## Overview
Implement a complete External Job Work feature with database tables, backend APIs, and frontend screens. This feature allows customers to create external job work records (simplified workflow) alongside regular projects when accepting quotations.

## Tasks

- [ ] 1. Create database migration for external_job_work, external_job_work_items, and external_job_work_history tables
- [ ] 2. Create backend route handler for external job work CRUD operations (POST, GET, PUT)
- [ ] 3. Create backend route handler for external job work items management (GET, POST, PUT, DELETE)
- [ ] 4. Create backend route handler for status history and status update endpoints
- [ ] 5. Create API client methods in src/config/api.js for external job work endpoints
- [ ] 6. Refactor ProjectListScreen to extract content component for reusability
- [ ] 7. Create ProjectAndJobWorkListScreen with tab navigation between projects and external job work
- [ ] 8. Create ExternalJobWorkListContent component to display list of external job work
- [ ] 9. Update App.js navigation to use new tabbed ProjectAndJobWorkListScreen
- [ ] 10. Create ExternalJobWorkDetailsScreen with full job work information display
- [ ] 11. Implement items management section in ExternalJobWorkDetailsScreen (view, add, edit, delete items)
- [ ] 12. Implement status history timeline view in ExternalJobWorkDetailsScreen
- [ ] 13. Create status change modal in ExternalJobWorkDetailsScreen with validation
- [ ] 14. Create ProjectTypeSelectionModal component for project type selection during customer acceptance
- [ ] 15. Integrate ProjectTypeSelectionModal into EnquiryScreen when customer accepts quotation
- [ ] 16. Implement regular project creation path when "Regular Project" selected in modal
- [ ] 17. Implement external job work creation path when "External Job Work" selected in modal
- [ ] 18. Update EnquiryScreen to handle both regular project and external job work workflows
- [ ] 19. Test all API endpoints for create, read, update, delete operations
- [ ] 20. Test authorization and company isolation for external job work endpoints
- [ ] 21. Test complete workflow: Customer acceptance → Modal → External Job Work creation
- [ ] 22. Test external job work list display and filtering
- [ ] 23. Test external job work details screen and all sub-features
- [ ] 24. Test status change workflow with history tracking
- [ ] 25. Update main dashboard to show external job work counts and overview
- [ ] 26. Update role-specific dashboards (NPD, PM, Management) to include external job work
- [ ] 27. Add code comments and JSDoc documentation to all new functions
- [ ] 28. Create user documentation with screenshots and step-by-step instructions
- [ ] 29. Verify no breaking changes to existing project workflow
- [ ] 30. Performance testing and optimization if needed

## Task Dependency Graph

```
Task 1 → Task 2, 3, 4
Task 2, 3, 4 → Task 5
Task 5 → Task 7, 10, 18
Task 6 → Task 7
Task 7 → Task 8, 9
Task 8 → Task 9
Task 9 → Task 10, 18
Task 10 → Task 11, 12, 13
Task 11, 12, 13 → Task 23
Task 14 → Task 15, 16, 17
Task 15, 16, 17 → Task 18
Task 18 → Task 21
Task 19, 20, 21, 22, 23, 24 → Task 29
Task 29 → Task 25, 26
Task 25, 26 → Task 27, 28
Task 27, 28 → Task 30
```

## Notes
- All tasks follow the design and requirements documents
- Database migration should be reversible
- API endpoints must enforce company-level authorization
- Frontend must match existing design patterns
- All status transitions must be validated
- History tracking must capture all status changes automatically
- Error handling must be comprehensive with user-friendly messages
