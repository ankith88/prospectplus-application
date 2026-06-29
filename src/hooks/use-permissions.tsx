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
  newLead: ['Marketing Admin', 'Marketing Manager', 'Lead Gen', 'Lead Gen Admin', 'Field Sales Admin', 'Account Managers', 'Account Manager', 'Customer Success', 'Sales Manager'],
  outboundLeads: ['user', 'Lead Gen', 'Lead Gen Admin', 'Franchisee', 'Sales Manager'],
  inboundLeads: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'Franchisee'],
  importLeads: ['Marketing Admin', 'Marketing Manager'],
  unassignedLeads: ['Lead Gen Admin'],
  accountManagerPipeline: ['Sales Manager', 'Account Managers', 'Account Manager'],
  customerSuccessPipeline: ['Customer Success', 'Marketing Manager'],
  reporting: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager'],
  fieldActivityReport: ['Marketing Admin', 'Marketing Manager', 'Field Sales', 'Field Sales Admin', 'Franchisee', 'Lead Gen Admin', 'Dashback', 'Sales Manager'],
  inboundReporting: ['Lead Gen Admin', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'Franchisee'],
  amReporting: ['Sales Manager', 'Account Managers', 'Account Manager', 'account managers'],
  archivedLeads: ['admin', 'Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Dashback', 'Sales Manager', 'Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer'],
  deploymentHistory: ['Sales Manager', 'Field Sales Admin'],
  signedCustomers: ['Marketing Admin', 'Marketing Manager', 'Lead Gen Admin', 'Franchisee', 'Account Managers', 'Account Manager', 'account managers', 'Customer Success', 'Sales Manager', 'Customer Service'],
  scans: ['superadmin', 'Customer Success', 'Account Managers', 'Account Manager', 'account managers', 'Sales Manager', 'Marketing Manager', 'Customer Service'],
  historyAppointments: ['Marketing Admin', 'Marketing Manager', 'user', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee
  historyCallsTranscripts: ['Marketing Admin', 'Marketing Manager', 'user', 'Lead Gen Admin', 'Dashback', 'Account Managers', 'Account Manager', 'account managers'], // history but not Field Sales/Franchisee/Field Sales Admin
  checkIns: ['Field Sales', 'Field Sales Admin', 'Lead Gen Admin', 'Dashback'],
  franchisees: ['Account Managers', 'Account Manager', 'account managers', 'dialers', 'Dialer', 'Marketing Manager', 'Customer Success', 'Customer Service', 'Sales Manager'],
  topBarcodesUsers: ['superadmin', 'Marketing Manager', 'Customer Service', 'Customer Success', 'Sales Manager', 'Account Managers', 'Account Manager'],
};

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, loading } = useAuth();
  const [roleAccessMatrix, setRoleAccessMatrix] = useState<Record<string, string[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    // We can fetch this regardless of user state to have it ready, or only if logged in.
    const matrixDocRef = doc(firestore, 'settings', 'roleAccessMatrix');
    
    // Seed default if it doesn't exist
    const seedDefault = async () => {
        try {
            const snapshot = await getDoc(matrixDocRef);
            if (!snapshot.exists()) {
                await setDoc(matrixDocRef, { features: DEFAULT_ROLE_ACCESS });
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

    const allowedRoles = roleAccessMatrix[feature] || DEFAULT_ROLE_ACCESS[feature] || [];
    return allowedRoles.includes(userProfile.activeRole);
  };

  return (
    <PermissionsContext.Provider value={{ roleAccessMatrix, canView, loadingPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
