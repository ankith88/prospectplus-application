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
  captureVisit: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Franchisee', 'Dashback'],
  visitNotes: ['Lead Gen', 'Lead Gen Admin', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Dashback', 'Sales Manager'],
  routesCoverage: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  teamSchedules: ['Field Sales Admin'],
  newLead: ['Marketing Admin', 'Marketing Manager', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin', 'Account Managers', 'Account Manager', 'Customer Success', 'Sales Manager', 'Customer Service', 'Outbound Admin'],
  outboundLeads: ['user', 'Outbound Admin', 'Lead Gen', 'Lead Gen Admin', 'Franchisee', 'Sales Manager'],
  inboundLeads: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'Franchisee'],
  importLeads: ['Marketing Admin', 'Marketing Manager', 'Outbound Admin'],
  unassignedLeads: ['Lead Gen Admin'],
  accountManagerPipeline: ['Sales Manager', 'Account Managers', 'Account Manager'],
  customerSuccessPipeline: ['Customer Success', 'Marketing Manager'],
  reporting: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager', 'user', 'Outbound Admin'],
  fieldActivityReport: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Lead Gen Admin', 'Dashback', 'Sales Manager'],
  inboundReporting: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'Franchisee', 'Marketing Manager'],
  amReporting: ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'],
  archivedLeads: ['admin', 'Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Dashback', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer'],
  deploymentHistory: ['Sales Manager', 'Field Sales Admin'],
  signedCustomers: ['Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Franchisee', 'Account Managers', 'Account Manager', 'account managers', 'Customer Success', 'Sales Manager', 'Customer Service'],
  scans: ['superadmin', 'Customer Success', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager', 'Marketing Manager', 'Customer Service'],
  historyAppointments: ['Marketing Admin', 'Marketing Manager', 'user', 'Outbound Admin', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee
  historyCallsTranscripts: ['Marketing Admin', 'Marketing Manager', 'user', 'Outbound Admin', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee/Field Sales Admin
  checkIns: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  franchisees: ['Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer', 'Marketing Manager', 'Customer Success', 'Customer Service', 'Sales Manager'],
  topBarcodesUsers: ['superadmin', 'Marketing Manager', 'Customer Service', 'Customer Success', 'Sales Manager', 'Account Managers', 'Account Manager'],
  lpoLeads: ['superadmin', 'operations', 'admin'],
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
                if (!currentNewLead.includes('Outbound Admin')) {
                    currentFeatures.newLead = Array.from(new Set([...currentNewLead, 'Outbound Admin']));
                    needsUpdate = true;
                }

                const currentImportLeads: string[] = currentFeatures.importLeads || DEFAULT_ROLE_ACCESS.importLeads;
                if (!currentImportLeads.includes('Outbound Admin')) {
                    currentFeatures.importLeads = Array.from(new Set([...currentImportLeads, 'Outbound Admin']));
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
    
    // Admin always has access to everything
    if (userProfile.activeRole === 'admin') return true;

    // Special case for ncyhwLtOG1W7TZ43PkYCcObeCAf2 and marketing
    if (feature === 'marketingGroup' && userProfile.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2') return true;

    // Hardcode override for AMs and Sales Managers to view templates/library
    if (feature === 'marketingGroup' && ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'].includes(userProfile.activeRole)) {
      return true;
    }

    // Hardcode override for Dialers to view Archived Leads page
    if (feature === 'archivedLeads' && ['dialers', 'Dialer'].includes(userProfile.activeRole)) {
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

    const firestoreRoles = roleAccessMatrix[feature] || [];
    const defaultRoles = DEFAULT_ROLE_ACCESS[feature] || [];
    const allowedRoles = Array.from(new Set([...firestoreRoles, ...defaultRoles]));
    return allowedRoles.includes(userProfile.activeRole);
  };

  return (
    <PermissionsContext.Provider value={{ roleAccessMatrix, canView, loadingPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
