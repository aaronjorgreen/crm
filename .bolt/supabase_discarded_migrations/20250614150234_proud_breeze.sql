-- Migration to remove all sample data from the database
-- This will clean up any test/demo data that was previously inserted

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Starting sample data cleanup...';

    -- Delete all sample data in reverse dependency order
    
    -- 1. Delete task comments (depends on tasks and users)
    DELETE FROM task_comments WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted task comments';

    -- 2. Delete AI extractions
    DELETE FROM ai_extractions WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted AI extractions';

    -- 3. Delete client assignments
    DELETE FROM client_assignments WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted client assignments';

    -- 4. Delete project costs
    DELETE FROM project_costs WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted project costs';

    -- 5. Delete tasks
    DELETE FROM tasks WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted tasks';

    -- 6. Delete project members
    DELETE FROM project_members WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted project members';

    -- 7. Delete projects
    DELETE FROM projects WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted projects';

    -- 8. Delete client contacts (depends on clients)
    DELETE FROM client_contacts WHERE client_id IN (
        SELECT id FROM clients WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid
    );
    RAISE NOTICE 'Deleted client contacts';

    -- 9. Delete clients
    DELETE FROM clients WHERE created_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted clients';

    -- 10. Delete any user activity logs related to sample data
    DELETE FROM user_activity_logs WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted user activity logs';

    -- 11. Delete any user invitations that might be sample data
    DELETE FROM user_invitations WHERE invited_by = '00000000-0000-0000-0000-000000000001'::uuid;
    RAISE NOTICE 'Deleted user invitations';

    -- Verify cleanup
    DECLARE
        remaining_clients int;
        remaining_projects int;
        remaining_tasks int;
        remaining_costs int;
        remaining_comments int;
        remaining_extractions int;
    BEGIN
        SELECT COUNT(*) INTO remaining_clients FROM clients;
        SELECT COUNT(*) INTO remaining_projects FROM projects;
        SELECT COUNT(*) INTO remaining_tasks FROM tasks;
        SELECT COUNT(*) INTO remaining_costs FROM project_costs;
        SELECT COUNT(*) INTO remaining_comments FROM task_comments;
        SELECT COUNT(*) INTO remaining_extractions FROM ai_extractions;
        
        RAISE NOTICE '=== SAMPLE DATA CLEANUP COMPLETED ===';
        RAISE NOTICE 'Remaining clients: %', remaining_clients;
        RAISE NOTICE 'Remaining projects: %', remaining_projects;
        RAISE NOTICE 'Remaining tasks: %', remaining_tasks;
        RAISE NOTICE 'Remaining costs: %', remaining_costs;
        RAISE NOTICE 'Remaining comments: %', remaining_comments;
        RAISE NOTICE 'Remaining AI extractions: %', remaining_extractions;
        RAISE NOTICE '=== DATABASE IS NOW CLEAN ===';
    END;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Sample data cleanup failed: %', SQLERRM;
END $$;

COMMIT;