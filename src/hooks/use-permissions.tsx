"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/lib/types';

interface PermissionsContextType {
  roleAccessMatrix: Record<string, string[]>;
  canView: (feature: string) => boolean;
  loadingPermissions: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  roleAccessMatrix: {},
  canView: () => false,
  loadingPermissions: true,
});

// Default initial configuration based on requirements
export const DEFAULT_ROLE_ACCESS: Record<string, string[]> = {
  executiveDashboard: ['Sales Manager', 'Marketing Manager'],
  tickets: ['superadmin', 'Customer Service', 'Marketing Manager'],
  marketingGroup: ['Marketing Admin', 'Marketing Manager', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers'],
  fieldSalesD2D: ['Field Sales', 'Field Sales Admin', 'Dashback'],
  captureVisit: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  visitNotes: ['Lead Gen', 'Lead Gen Admin', 'Field Sales', 'Field Sales Admin', 'Dashback', 'Sales Manager'],
  routesCoverage: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  teamSchedules: ['Field Sales Admin'],
  newLead: ['Marketing Admin', 'Marketing Manager', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin', 'Account Managers', 'Account Manager', 'Customer Success', 'Sales Manager', 'Customer Service', 'Outbound Admin', 'Franchisee'],
  outboundLeads: ['user', 'Outbound Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee', 'Sales Manager'],
  inboundLeads: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'Franchisee'],
  importLeads: ['Marketing Admin', 'Marketing Manager', 'Outbound Admin'],
  inReviewLeads: ['admin', 'superadmin', 'Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Sales Manager', 'Outbound Admin', 'user', 'Dialer', 'dialers', 'Account Managers', 'Account Manager'],
  unassignedLeads: ['Lead Gen Admin'],
  accountManagerPipeline: ['Sales Manager', 'Account Managers', 'Account Manager'],
  customerSuccessPipeline: ['Customer Success', 'Marketing Manager'],
  reporting: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager', 'user', 'Outbound Admin'],
  fieldActivityReport: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback', 'Sales Manager'],
  inboundReporting: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'Marketing Manager'],
  amReporting: ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'],
  archivedLeads: ['admin', 'Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Dashback', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer', 'user', 'Outbound Admin'],
  deploymentHistory: ['Sales Manager', 'Field Sales Admin'],
  signedCustomers: ['Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Franchisee', 'Account Managers', 'Account Manager', 'account managers', 'Customer Success', 'Sales Manager', 'Customer Service'],
  scans: ['superadmin', 'Customer Success', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager', 'Marketing Manager', 'Customer Service'],
  historyAppointments: ['Marketing Admin', 'Marketing Manager', 'user', 'Outbound Admin', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee
  historyCallsTranscripts: ['Marketing Admin', 'Marketing Manager', 'user', 'Outbound Admin', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee/Field Sales Admin
  checkIns: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  franchisees: ['Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer', 'Marketing Manager', 'Customer Success', 'customer success', 'customer_success', 'Customer Service', 'customer service', 'customer_service', 'Sales Manager'],
  territoryMap: ['superadmin', 'admin', 'Franchisee', 'franchisee', 'Executive', 'executive', 'Outbound Admin', 'outbound admin', 'Customer Service', 'customer service', 'customer_service', 'Customer Success', 'customer success', 'customer_success'],
  topBarcodesUsers: ['superadmin', 'Marketing Manager', 'Customer Service', 'Customer Success', 'Sales Manager', 'Account Managers', 'Account Manager'],
  lpoLeads: ['superadmin', 'operations', 'admin'],
  franchiseeVerification: ['admin', 'superadmin'],
  customerSuccessOnboarding: ['Customer Success', 'Marketing Manager', 'superadmin', 'admin'],
};

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, loading } = useAuth();
  const [roleAccessMatrix, setRoleAccessMatrix] = useState<Record<string, string[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    // We can fetch this regardless of user state to have it ready, or only if logged in.
    const matrixDocRef = doc(firestore, 'settings', 'roleAccessMatrix');
    
    // Seed default if it doesn't exist or ensure reporting includes user / Outbound Admin
    const seedDefault = async () => {
        try {
            const snapshot = await getDoc(matrixDocRef);
            if (!snapshot.exists()) {
                await setDoc(matrixDocRef, { features: DEFAULT_ROLE_ACCESS });
            } else {
                const currentFeatures = snapshot.data()?.features || {};
                let needsUpdate = false;

                const currentReporting: string[] = currentFeatures.reporting || [];
                if (!currentReporting.includes('user') || !currentReporting.includes('Outbound Admin')) {
                    currentFeatures.reporting = Array.from(new Set([...currentReporting, 'user', 'Outbound Admin']));
                    needsUpdate = true;
                }

                const currentNewLead: string[] = currentFeatures.newLead || DEFAULT_ROLE_ACCESS.newLead;
                if (!currentNewLead.includes('Outbound Admin') || !currentNewLead.includes('Franchisee')) {
                    currentFeatures.newLead = Array.from(new Set([...currentNewLead, 'Outbound Admin', 'Franchisee']));
                    needsUpdate = true;
                }

                const currentImportLeads: string[] = currentFeatures.importLeads || DEFAULT_ROLE_ACCESS.importLeads;
                if (!currentImportLeads.includes('Outbound Admin')) {
                    currentFeatures.importLeads = Array.from(new Set([...currentImportLeads, 'Outbound Admin']));
                    needsUpdate = true;
                }

                const currentArchivedLeads: string[] = currentFeatures.archivedLeads || DEFAULT_ROLE_ACCESS.archivedLeads;
                if (!currentArchivedLeads.includes('Outbound Admin') || !currentArchivedLeads.includes('user')) {
                    currentFeatures.archivedLeads = Array.from(new Set([...currentArchivedLeads, 'Outbound Admin', 'user']));
                    needsUpdate = true;
                }

                const currentTerritoryMap: string[] = currentFeatures.territoryMap || DEFAULT_ROLE_ACCESS.territoryMap;
                if (!currentTerritoryMap.includes('Customer Service') || !currentTerritoryMap.includes('Customer Success')) {
                    currentFeatures.territoryMap = Array.from(new Set([
                        ...currentTerritoryMap,
                        'Customer Service', 'customer service', 'customer_service',
                        'Customer Success', 'customer success', 'customer_success',
                        'Franchisee', 'franchisee', 'Executive', 'executive', 'Outbound Admin', 'outbound admin'
                    ]));
                    needsUpdate = true;
                }

                const currentFranchisees: string[] = currentFeatures.franchisees || DEFAULT_ROLE_ACCESS.franchisees;
                if (!currentFranchisees.includes('Customer Service') || !currentFranchisees.includes('Customer Success')) {
                    currentFeatures.franchisees = Array.from(new Set([
                        ...currentFranchisees,
                        'Customer Service', 'customer service', 'customer_service',
                        'Customer Success', 'customer success', 'customer_success'
                    ]));
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await setDoc(matrixDocRef, { features: currentFeatures }, { merge: true });
                }
            }
        } catch (e) {
            console.error("Error seeding default permissions:", e);
        }
    };
    seedDefault();

    const unsubscribe = onSnapshot(matrixDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoleAccessMatrix(docSnap.data().features || {});
      } else {
        setRoleAccessMatrix(DEFAULT_ROLE_ACCESS);
      }
      setLoadingPermissions(false);
    }, (error) => {
        console.error("Error fetching permissions:", error);
        setRoleAccessMatrix(DEFAULT_ROLE_ACCESS);
        setLoadingPermissions(false);
    });

    return () => unsubscribe();
  }, []);

  const canView = (feature: string): boolean => {
    if (!userProfile?.activeRole) return false;
    
    // Explicitly restrict Franchisee role from reporting, field sales, visit notes, and capture visit
    if (userProfile.activeRole?.toLowerCase() === 'franchisee' && ['reporting', 'inboundReporting', 'fieldActivityReport', 'fieldSalesD2D', 'visitNotes', 'captureVisit'].includes(feature)) {
      return false;
    }

    // Admin always has access to everything
    if (userProfile.activeRole === 'admin' || userProfile.activeRole?.toLowerCase() === 'admin' || userProfile.activeRole?.toLowerCase() === 'superadmin') return true;

    // Territory map override
    if (feature === 'territoryMap') {
      const roleLower = userProfile.activeRole.toLowerCase();
      if (['admin', 'superadmin', 'franchisee', 'executive', 'outbound admin', 'customer service', 'customer_service', 'customer success', 'customer_success'].includes(roleLower)) {
        return true;
      }
    }

    // Special case for ncyhwLtOG1W7TZ43PkYCcObeCAf2 and marketing
    if (feature === 'marketingGroup' && userProfile.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2') return true;

    // Hardcode override for AMs and Sales Managers to view templates/library
    if (feature === 'marketingGroup' && ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'].includes(userProfile.activeRole)) {
      return true;
    }

    // Hardcode override for Dialers and users with role 'user' to view Archived Leads page
    if (feature === 'archivedLeads' && ['dialers', 'Dialer', 'user'].includes(userProfile.activeRole)) {
      return true;
    }

    // Hardcode override for Marketing Manager to access Inbound Reporting
    if (feature === 'inboundReporting' && userProfile.activeRole === 'Marketing Manager') {
      return true;
    }

    // Explicit override for user and Outbound Admin to access Outbound Reporting
    if (feature === 'reporting' && ['user', 'Outbound Admin'].includes(userProfile.activeRole)) {
      return true;
    }

    // Explicit override for Franchisee to create leads
    if (feature === 'newLead' && (userProfile.activeRole === 'Franchisee' || userProfile.activeRole?.toLowerCase() === 'franchisee')) {
      return true;
    }

    const firestoreRoles = roleAccessMatrix[feature] || [];
    const defaultRoles = DEFAULT_ROLE_ACCESS[feature] || [];
    const allowedRoles = Array.from(new Set([...firestoreRoles, ...defaultRoles]));
    
    const userRoleNormalized = userProfile.activeRole.toLowerCase().replace(/_/g, ' ').trim();
    return allowedRoles.some(r => r.toLowerCase().replace(/_/g, ' ').trim() === userRoleNormalized);
  };

  return (
    <PermissionsContext.Provider value={{ roleAccessMatrix, canView, loadingPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
