import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

/**
 * DataMigration - Utility component to migrate localStorage data to Supabase
 * This runs automatically once after a user signs in for the first time
 */
export function useDataMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'migrating' | 'complete' | 'error'>('pending');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    const runMigration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user || !session.access_token) {
          return; // Not authenticated, skip migration
        }

        // Check if migration has already been done
        const migrationKey = `migration_complete_${session.user.id}`;
        if (localStorage.getItem(migrationKey)) {
          setMigrationStatus('complete');
          return;
        }

        setMigrationStatus('migrating');
        console.log('[DataMigration] Starting migration for user:', session.user.id);

        // 1. Migrate saved assessments from 'savedAssessments' key
        const savedAssessmentsStr = localStorage.getItem('savedAssessments');
        if (savedAssessmentsStr) {
          try {
            const assessments = JSON.parse(savedAssessmentsStr);
            if (Array.isArray(assessments) && assessments.length > 0) {
              console.log(`[DataMigration] Migrating ${assessments.length} assessments...`);
              
              for (const assessment of assessments) {
                await fetch('/api/user/assessments', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({ assessment_data: assessment })
                });
              }
              
              console.log('[DataMigration] Assessments migrated successfully');
            }
          } catch (err) {
            console.error('[DataMigration] Failed to migrate assessments:', err);
          }
        }

        // 2. Migrate global settings from 'airroi_global_settings' key
        const globalSettingsStr = localStorage.getItem('airroi_global_settings');
        if (globalSettingsStr) {
          try {
            const settings = JSON.parse(globalSettingsStr);
            console.log('[DataMigration] Migrating global settings...');
            
            await fetch('/api/user/settings', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ settings_data: settings })
            });
            
            console.log('[DataMigration] Settings migrated successfully');
          } catch (err) {
            console.error('[DataMigration] Failed to migrate settings:', err);
          }
        }

        // 3. Migrate investment targets from 'investmentTargets' key
        const investmentTargetsStr = localStorage.getItem('investmentTargets');
        if (investmentTargetsStr) {
          try {
            const targets = JSON.parse(investmentTargetsStr);
            console.log('[DataMigration] Migrating investment targets...');
            
            // Merge with existing settings or create new entry
            const existingSettings = globalSettingsStr ? JSON.parse(globalSettingsStr) : {};
            const mergedSettings = { ...existingSettings, investmentTargets: targets };
            
            await fetch('/api/user/settings', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ settings_data: mergedSettings })
            });
            
            console.log('[DataMigration] Investment targets migrated successfully');
          } catch (err) {
            console.error('[DataMigration] Failed to migrate investment targets:', err);
          }
        }

        // Mark migration as complete
        localStorage.setItem(migrationKey, 'true');
        setMigrationStatus('complete');
        console.log('[DataMigration] Migration complete');

      } catch (error: any) {
        console.error('[DataMigration] Migration failed:', error);
        setMigrationError(error.message || 'Unknown error');
        setMigrationStatus('error');
      }
    };

    runMigration();
  }, []);

  return { migrationStatus, migrationError };
}

/**
 * Optional: Component to display migration status to user
 */
export function DataMigrationNotice() {
  const { migrationStatus, migrationError } = useDataMigration();

  if (migrationStatus === 'pending' || migrationStatus === 'complete') {
    return null; // Don't show anything if not migrating or already done
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm bg-white border border-slate-200 rounded-lg shadow-lg p-4">
      {migrationStatus === 'migrating' && (
        <>
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Migrating your data...</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Transferring your saved assessments and settings to your account.
          </p>
        </>
      )}
      
      {migrationStatus === 'error' && (
        <>
          <div className="text-red-600 font-semibold">Migration Error</div>
          <p className="text-xs text-slate-600 mt-1">{migrationError}</p>
        </>
      )}
    </div>
  );
}
