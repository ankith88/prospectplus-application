'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, ChevronsUpDown, Store } from 'lucide-react';

export function FranchiseeSwitcher() {
  const { userProfile, switchFranchisee } = useAuth();

  if (!userProfile) return null;

  const isFranchiseeRole = userProfile.activeRole === 'Franchisee' || userProfile.role === 'Franchisee';
  const linkedFranchisees = userProfile.linkedFranchisees || [];

  // Fallback if user has franchisee set but no linkedFranchisees array
  const effectiveList = linkedFranchisees.length > 0 ? linkedFranchisees : (userProfile.franchisee ? [{
    franchiseeId: userProfile.franchiseeId || userProfile.franchiseeInternalId || 'default',
    franchiseeName: userProfile.franchisee,
    relationship: userProfile.franchiseeRole || 'owner',
  }] : []);

  if (!isFranchiseeRole && effectiveList.length === 0) return null;

  const currentFranId = userProfile.activeFranchiseeId || userProfile.franchiseeId || effectiveList[0]?.franchiseeId;
  const activeEntry = effectiveList.find(f => f.franchiseeId === currentFranId) || effectiveList[0];

  const activeName = activeEntry?.franchiseeName || userProfile.franchisee || 'Franchise';
  const activeRole = activeEntry?.relationship || userProfile.franchiseeRole || 'owner';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 h-9 px-3 border-[#095c7b]/30 bg-[#095c7b]/5 hover:bg-[#095c7b]/10 text-[#095c7b] font-medium text-xs rounded-full">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[140px] font-semibold">{activeName}</span>
          <Badge className={`text-[10px] py-0 px-1.5 capitalize font-medium ${activeRole === 'owner' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'}`}>
            {activeRole}
          </Badge>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Switch Franchise
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {effectiveList.map((fran) => {
          const isSelected = fran.franchiseeId === currentFranId;
          return (
            <DropdownMenuItem
              key={fran.franchiseeId}
              onClick={() => switchFranchisee(fran.franchiseeId)}
              className="cursor-pointer flex items-center justify-between py-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{fran.franchiseeName}</span>
                <span className="text-[10px] text-muted-foreground capitalize">({fran.relationship})</span>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-[#095c7b] shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
