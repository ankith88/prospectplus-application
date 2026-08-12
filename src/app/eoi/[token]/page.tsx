'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { CheckCircle2, FileText, DollarSign, PenTool, RefreshCw, UserCheck, ShieldAlert, Plus, Trash2, HelpCircle, CheckSquare, Info } from 'lucide-react';

interface EmploymentEntry {
  occupation: string;
  position: string;
  company: string;
  businessType: string;
  address: string;
  contactPerson: string;
  phone: string;
  periodOfEmployment: string;
  commencementDate: string;
  reasonLeft: string;
  responsibilities: string;
}

interface ReferenceEntry {
  name: string;
  phone: string;
  position: string;
  company: string;
  nature: string;
}

export default function PublicEOIPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  // --- Section 1: Structure & Company ---
  const [entityStructure, setEntityStructure] = useState<'SOLE TRADER' | 'PARTNERSHIP' | 'PTY LTD COMPANY' | 'LTD COMPANY'>('SOLE TRADER');
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [phoneBusiness, setPhoneBusiness] = useState('');
  const [facsimileNo, setFacsimileNo] = useState('');

  // --- Section 2: Applicant 1 Details ---
  const [applicant1Name, setApplicant1Name] = useState('');
  const [applicant1Position, setApplicant1Position] = useState('SOLE TRADER');
  const [applicant1PrivateAddress, setApplicant1PrivateAddress] = useState('');
  const [applicant1PhoneHome, setApplicant1PhoneHome] = useState('');
  const [applicant1PhoneBusiness, setApplicant1PhoneBusiness] = useState('');
  const [applicant1Email, setApplicant1Email] = useState('');
  const [applicant1DriversLicence, setApplicant1DriversLicence] = useState('');
  const [applicant1DriversLicencePlace, setApplicant1DriversLicencePlace] = useState('');
  const [applicant1DateOfBirth, setApplicant1DateOfBirth] = useState('');
  const [applicant1MaritalStatus, setApplicant1MaritalStatus] = useState('');
  const [applicant1SpouseName, setApplicant1SpouseName] = useState('');
  const [applicant1SpouseAge, setApplicant1SpouseAge] = useState('');
  const [applicant1ChildrenAges, setApplicant1ChildrenAges] = useState('');
  const [applicant1SpouseActive, setApplicant1SpouseActive] = useState('No');
  const [applicant1OwnershipPercent, setApplicant1OwnershipPercent] = useState('100');
  const [applicant1OtherDirectorships, setApplicant1OtherDirectorships] = useState('');
  const [applicant1FormerAddress, setApplicant1FormerAddress] = useState('');
  const [applicant1HealthStatus, setApplicant1HealthStatus] = useState('GOOD');
  const [applicant1PhysicalLimitations, setApplicant1PhysicalLimitations] = useState('');
  const [applicant1Qualifications, setApplicant1Qualifications] = useState('');
  const [applicant1SalesTraining, setApplicant1SalesTraining] = useState('');

  // --- Section 2 (cont): Applicant 2 Details (Optional) ---
  const [hasApplicant2, setHasApplicant2] = useState(false);
  const [applicant2Name, setApplicant2Name] = useState('');
  const [applicant2Position, setApplicant2Position] = useState('PARTNER');
  const [applicant2PrivateAddress, setApplicant2PrivateAddress] = useState('');
  const [applicant2PhoneHome, setApplicant2PhoneHome] = useState('');
  const [applicant2PhoneBusiness, setApplicant2PhoneBusiness] = useState('');
  const [applicant2Email, setApplicant2Email] = useState('');
  const [applicant2DriversLicence, setApplicant2DriversLicence] = useState('');
  const [applicant2DriversLicencePlace, setApplicant2DriversLicencePlace] = useState('');
  const [applicant2DateOfBirth, setApplicant2DateOfBirth] = useState('');
  const [applicant2MaritalStatus, setApplicant2MaritalStatus] = useState('');
  const [applicant2SpouseName, setApplicant2SpouseName] = useState('');
  const [applicant2SpouseAge, setApplicant2SpouseAge] = useState('');
  const [applicant2ChildrenAges, setApplicant2ChildrenAges] = useState('');
  const [applicant2SpouseActive, setApplicant2SpouseActive] = useState('No');
  const [applicant2OwnershipPercent, setApplicant2OwnershipPercent] = useState('0');
  const [applicant2OtherDirectorships, setApplicant2OtherDirectorships] = useState('');
  const [applicant2FormerAddress, setApplicant2FormerAddress] = useState('');
  const [applicant2HealthStatus, setApplicant2HealthStatus] = useState('GOOD');
  const [applicant2PhysicalLimitations, setApplicant2PhysicalLimitations] = useState('');
  const [applicant2Qualifications, setApplicant2Qualifications] = useState('');
  const [applicant2SalesTraining, setApplicant2SalesTraining] = useState('');

  // --- Section 3: Trusts ---
  const [trustName, setTrustName] = useState('');
  const [trustEstablishedDate, setTrustEstablishedDate] = useState('');
  const [trustBeneficiaries, setTrustBeneficiaries] = useState('');

  // --- Section 4: Employment History ---
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentEntry[]>([
    { occupation: '', position: '', company: '', businessType: '', address: '', contactPerson: '', phone: '', periodOfEmployment: '', commencementDate: '', reasonLeft: '', responsibilities: '' }
  ]);

  // --- Section 5: References ---
  const [references, setReferences] = useState<ReferenceEntry[]>([
    { name: '', phone: '', position: '', company: '', nature: 'Trade Reference 1' },
    { name: '', phone: '', position: '', company: '', nature: 'Trade Reference 2' },
    { name: '', phone: '', position: '', company: '', nature: 'Personal Reference' },
  ]);

  // --- Section 6: Convictions & Legal Proceedings ---
  const [convictionPlaceYear, setConvictionPlaceYear] = useState('');
  const [convictionType, setConvictionType] = useState('');
  const [convictionPenalty, setConvictionPenalty] = useState('');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [yearIssued, setYearIssued] = useState('');
  const [yearConcluded, setYearConcluded] = useState('');
  const [subjectMatter, setSubjectMatter] = useState('');
  const [judgmentNatureQuantum, setJudgmentNatureQuantum] = useState('');

  // --- Section 7: Household Income & Expenditure (Monthly Breakdown) ---
  const [incSalary, setIncSalary] = useState('');
  const [incBonus, setIncBonus] = useState('');
  const [incDividends, setIncDividends] = useState('');
  const [incRealEstate, setIncRealEstate] = useState('');
  const [incOther, setIncOther] = useState('');
  const [incOtherSpecify, setIncOtherSpecify] = useState('');

  const [expMortgage, setExpMortgage] = useState('');
  const [expLoans, setExpLoans] = useState('');
  const [expCreditCard, setExpCreditCard] = useState('');
  const [expPhoneElectric, setExpPhoneElectric] = useState('');
  const [expSchoolFees, setExpSchoolFees] = useState('');
  const [expRatesTaxes, setExpRatesTaxes] = useState('');
  const [expInsurance, setExpInsurance] = useState('');
  const [expOther, setExpOther] = useState('');
  const [expOtherSpecify, setExpOtherSpecify] = useState('');

  // --- Section 8: Statement of Assets & Liabilities ---
  const [astRealEstate, setAstRealEstate] = useState('');
  const [astCash, setAstCash] = useState('');
  const [astBusinessNetValue, setAstBusinessNetValue] = useState('');
  const [astSharesBonds, setAstSharesBonds] = useState('');
  const [astOther, setAstOther] = useState('');

  const [liabRealEstateMortgages, setLiabRealEstateMortgages] = useState('');
  const [liabNotesLoansInst, setLiabNotesLoansInst] = useState('');
  const [liabFriendsRelatives, setLiabFriendsRelatives] = useState('');
  const [liabOtherDebts, setLiabOtherDebts] = useState('');

  // --- Section 9: General Enquiry by MailPlus ---
  const [reasonForPurchase, setReasonForPurchase] = useState('');
  const [fundingSource, setFundingSource] = useState('');
  const [whySuited, setWhySuited] = useState('');
  const [similarBusinessExperience, setSimilarBusinessExperience] = useState('No');
  const [similarBusinessDetails, setSimilarBusinessDetails] = useState('');
  const [preparedToComply, setPreparedToComply] = useState('Yes');
  const [whySuccessful, setWhySuccessful] = useState('');
  const [valuableQualities, setValuableQualities] = useState('');
  const [fullTimeDevotion, setFullTimeDevotion] = useState('Yes');
  const [operatingHoursDetails, setOperatingHoursDetails] = useState('');
  const [mainStrengths, setMainStrengths] = useState('');
  const [mainWeaknesses, setMainWeaknesses] = useState('');
  const [knowsFranchiseDefinition, setKnowsFranchiseDefinition] = useState('Yes');
  const [franchiseDefinitionExplanation, setFranchiseDefinitionExplanation] = useState('');
  const [understandsRelationship, setUnderstandsRelationship] = useState('Yes');
  const [relationshipExplanation, setRelationshipExplanation] = useState('');
  const [acceptsGuidance, setAcceptsGuidance] = useState('Yes');
  const [knowsDefinedTerm, setKnowsDefinedTerm] = useState('Yes');
  const [representationsMade, setRepresentationsMade] = useState('');
  const [understandsIndependentAdvice, setUnderstandsIndependentAdvice] = useState('Yes');

  // --- Section 12 & 13: Franchise Purchase & Info Statement ---
  const [requiresFinance, setRequiresFinance] = useState('No');
  const [authorizeFinanceSharing, setAuthorizeFinanceSharing] = useState('No');
  const [informationStatementConfirmed, setInformationStatementConfirmed] = useState(true);
  const [informationStatementDate, setInformationStatementDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Digital Signature Canvas ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // --- Submission State ---
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Derived Calculations
  const calculatedTotalIncome = (Number(incSalary) || 0) + (Number(incBonus) || 0) + (Number(incDividends) || 0) + (Number(incRealEstate) || 0) + (Number(incOther) || 0);
  const calculatedTotalExpenditure = (Number(expMortgage) || 0) + (Number(expLoans) || 0) + (Number(expCreditCard) || 0) + (Number(expPhoneElectric) || 0) + (Number(expSchoolFees) || 0) + (Number(expRatesTaxes) || 0) + (Number(expInsurance) || 0) + (Number(expOther) || 0);
  const calculatedTotalAssets = (Number(astRealEstate) || 0) + (Number(astCash) || 0) + (Number(astBusinessNetValue) || 0) + (Number(astSharesBonds) || 0) + (Number(astOther) || 0);
  const calculatedTotalLiabilities = (Number(liabRealEstateMortgages) || 0) + (Number(liabNotesLoansInst) || 0) + (Number(liabFriendsRelatives) || 0) + (Number(liabOtherDebts) || 0);
  const calculatedNetWorth = calculatedTotalAssets - calculatedTotalLiabilities;

  useEffect(() => {
    async function loadEOI() {
      if (!token) return;
      try {
        const res = await fetch(`/api/eoi/sign?token=${token}`);
        const json = await res.json();
        if (json.success && json.prospect) {
          const p = json.prospect;
          setProspectData(p);
          
          // Initial default values from prospect profile
          setApplicant1Name(p.fullName || '');
          setApplicant1Email(p.email || '');
          setApplicant1PhoneBusiness(p.phone || '');
          setCompanyName(p.fullName || '');
          setPhoneBusiness(p.phone || '');

          // If prefilled eoiData exists, populate form state
          if (p.eoiData) {
            const d = p.eoiData;
            if (d.status === 'signed_online') setIsSuccess(true);

            if (d.entityStructure) setEntityStructure(d.entityStructure);
            if (d.companyName) setCompanyName(d.companyName);
            if (d.abn) setAbn(d.abn);
            if (d.registeredAddress) setRegisteredAddress(d.registeredAddress);
            if (d.businessAddress) setBusinessAddress(d.businessAddress);
            if (d.phoneHome) setPhoneHome(d.phoneHome);
            if (d.phoneBusiness) setPhoneBusiness(d.phoneBusiness);
            if (d.facsimileNo) setFacsimileNo(d.facsimileNo);

            // Applicant 1
            if (d.applicant1Name) setApplicant1Name(d.applicant1Name);
            if (d.applicant1Position) setApplicant1Position(d.applicant1Position);
            if (d.applicant1PrivateAddress) setApplicant1PrivateAddress(d.applicant1PrivateAddress);
            if (d.applicant1PhoneHome) setApplicant1PhoneHome(d.applicant1PhoneHome);
            if (d.applicant1PhoneBusiness) setApplicant1PhoneBusiness(d.applicant1PhoneBusiness);
            if (d.applicant1Email) setApplicant1Email(d.applicant1Email);
            if (d.applicant1DriversLicence) setApplicant1DriversLicence(d.applicant1DriversLicence);
            if (d.applicant1DriversLicencePlace) setApplicant1DriversLicencePlace(d.applicant1DriversLicencePlace);
            if (d.applicant1DateOfBirth) setApplicant1DateOfBirth(d.applicant1DateOfBirth);
            if (d.applicant1MaritalStatus) setApplicant1MaritalStatus(d.applicant1MaritalStatus);
            if (d.applicant1SpouseName) setApplicant1SpouseName(d.applicant1SpouseName);
            if (d.applicant1SpouseAge) setApplicant1SpouseAge(String(d.applicant1SpouseAge));
            if (d.applicant1ChildrenAges) setApplicant1ChildrenAges(d.applicant1ChildrenAges);
            if (d.applicant1SpouseActive !== undefined) setApplicant1SpouseActive(d.applicant1SpouseActive ? 'Yes' : 'No');
            if (d.applicant1OwnershipPercent) setApplicant1OwnershipPercent(String(d.applicant1OwnershipPercent));
            if (d.applicant1OtherDirectorships) setApplicant1OtherDirectorships(d.applicant1OtherDirectorships);
            if (d.applicant1FormerAddress) setApplicant1FormerAddress(d.applicant1FormerAddress);
            if (d.applicant1HealthStatus) setApplicant1HealthStatus(d.applicant1HealthStatus);
            if (d.applicant1PhysicalLimitations) setApplicant1PhysicalLimitations(d.applicant1PhysicalLimitations);
            if (d.applicant1Qualifications) setApplicant1Qualifications(d.applicant1Qualifications);
            if (d.applicant1SalesTraining) setApplicant1SalesTraining(d.applicant1SalesTraining);

            // Applicant 2
            if (d.hasApplicant2 !== undefined) setHasApplicant2(Boolean(d.hasApplicant2));
            if (d.applicant2Name) setApplicant2Name(d.applicant2Name);
            if (d.applicant2Position) setApplicant2Position(d.applicant2Position);
            if (d.applicant2PrivateAddress) setApplicant2PrivateAddress(d.applicant2PrivateAddress);
            if (d.applicant2PhoneHome) setApplicant2PhoneHome(d.applicant2PhoneHome);
            if (d.applicant2PhoneBusiness) setApplicant2PhoneBusiness(d.applicant2PhoneBusiness);
            if (d.applicant2Email) setApplicant2Email(d.applicant2Email);
            if (d.applicant2DriversLicence) setApplicant2DriversLicence(d.applicant2DriversLicence);
            if (d.applicant2DriversLicencePlace) setApplicant2DriversLicencePlace(d.applicant2DriversLicencePlace);
            if (d.applicant2DateOfBirth) setApplicant2DateOfBirth(d.applicant2DateOfBirth);
            if (d.applicant2MaritalStatus) setApplicant2MaritalStatus(d.applicant2MaritalStatus);
            if (d.applicant2SpouseName) setApplicant2SpouseName(d.applicant2SpouseName);
            if (d.applicant2SpouseAge) setApplicant2SpouseAge(String(d.applicant2SpouseAge));
            if (d.applicant2ChildrenAges) setApplicant2ChildrenAges(d.applicant2ChildrenAges);
            if (d.applicant2SpouseActive !== undefined) setApplicant2SpouseActive(d.applicant2SpouseActive ? 'Yes' : 'No');
            if (d.applicant2OwnershipPercent) setApplicant2OwnershipPercent(String(d.applicant2OwnershipPercent));
            if (d.applicant2OtherDirectorships) setApplicant2OtherDirectorships(d.applicant2OtherDirectorships);
            if (d.applicant2FormerAddress) setApplicant2FormerAddress(d.applicant2FormerAddress);
            if (d.applicant2HealthStatus) setApplicant2HealthStatus(d.applicant2HealthStatus);
            if (d.applicant2PhysicalLimitations) setApplicant2PhysicalLimitations(d.applicant2PhysicalLimitations);
            if (d.applicant2Qualifications) setApplicant2Qualifications(d.applicant2Qualifications);
            if (d.applicant2SalesTraining) setApplicant2SalesTraining(d.applicant2SalesTraining);

            // Trusts
            if (d.trustName) setTrustName(d.trustName);
            if (d.trustEstablishedDate) setTrustEstablishedDate(d.trustEstablishedDate);
            if (d.trustBeneficiaries) setTrustBeneficiaries(d.trustBeneficiaries);

            // Employment & References
            if (d.employmentHistory && d.employmentHistory.length > 0) setEmploymentHistory(d.employmentHistory);
            if (d.references && d.references.length > 0) setReferences(d.references);

            // Convictions
            if (d.convictionPlaceYear) setConvictionPlaceYear(d.convictionPlaceYear);
            if (d.convictionType) setConvictionType(d.convictionType);
            if (d.convictionPenalty) setConvictionPenalty(d.convictionPenalty);
            if (d.plaintiffName) setPlaintiffName(d.plaintiffName);
            if (d.defendantName) setDefendantName(d.defendantName);
            if (d.yearIssued) setYearIssued(d.yearIssued);
            if (d.yearConcluded) setYearConcluded(d.yearConcluded);
            if (d.subjectMatter) setSubjectMatter(d.subjectMatter);
            if (d.judgmentNatureQuantum) setJudgmentNatureQuantum(d.judgmentNatureQuantum);

            // Income / Exp
            if (d.incSalary !== undefined) setIncSalary(String(d.incSalary));
            if (d.incBonus !== undefined) setIncBonus(String(d.incBonus));
            if (d.incDividends !== undefined) setIncDividends(String(d.incDividends));
            if (d.incRealEstate !== undefined) setIncRealEstate(String(d.incRealEstate));
            if (d.incOther !== undefined) setIncOther(String(d.incOther));
            if (d.incOtherSpecify) setIncOtherSpecify(d.incOtherSpecify);

            if (d.expMortgage !== undefined) setExpMortgage(String(d.expMortgage));
            if (d.expLoans !== undefined) setExpLoans(String(d.expLoans));
            if (d.expCreditCard !== undefined) setExpCreditCard(String(d.expCreditCard));
            if (d.expPhoneElectric !== undefined) setExpPhoneElectric(String(d.expPhoneElectric));
            if (d.expSchoolFees !== undefined) setExpSchoolFees(String(d.expSchoolFees));
            if (d.expRatesTaxes !== undefined) setExpRatesTaxes(String(d.expRatesTaxes));
            if (d.expInsurance !== undefined) setExpInsurance(String(d.expInsurance));
            if (d.expOther !== undefined) setExpOther(String(d.expOther));
            if (d.expOtherSpecify) setExpOtherSpecify(d.expOtherSpecify);

            // Assets / Liab
            if (d.astRealEstate !== undefined) setAstRealEstate(String(d.astRealEstate));
            if (d.astCash !== undefined) setAstCash(String(d.astCash));
            if (d.astBusinessNetValue !== undefined) setAstBusinessNetValue(String(d.astBusinessNetValue));
            if (d.astSharesBonds !== undefined) setAstSharesBonds(String(d.astSharesBonds));
            if (d.astOther !== undefined) setAstOther(String(d.astOther));

            if (d.liabRealEstateMortgages !== undefined) setLiabRealEstateMortgages(String(d.liabRealEstateMortgages));
            if (d.liabNotesLoansInst !== undefined) setLiabNotesLoansInst(String(d.liabNotesLoansInst));
            if (d.liabFriendsRelatives !== undefined) setLiabFriendsRelatives(String(d.liabFriendsRelatives));
            if (d.liabOtherDebts !== undefined) setLiabOtherDebts(String(d.liabOtherDebts));

            // General Enquiry
            if (d.reasonForPurchase) setReasonForPurchase(d.reasonForPurchase);
            if (d.fundingSource) setFundingSource(d.fundingSource);
            if (d.whySuited) setWhySuited(d.whySuited);
            if (d.similarBusinessExperience !== undefined) setSimilarBusinessExperience(d.similarBusinessExperience ? 'Yes' : 'No');
            if (d.similarBusinessDetails) setSimilarBusinessDetails(d.similarBusinessDetails);
            if (d.preparedToComply !== undefined) setPreparedToComply(d.preparedToComply ? 'Yes' : 'No');
            if (d.whySuccessful) setWhySuccessful(d.whySuccessful);
            if (d.valuableQualities) setValuableQualities(d.valuableQualities);
            if (d.fullTimeDevotion !== undefined) setFullTimeDevotion(d.fullTimeDevotion ? 'Yes' : 'No');
            if (d.operatingHoursDetails) setOperatingHoursDetails(d.operatingHoursDetails);
            if (d.mainStrengths) setMainStrengths(d.mainStrengths);
            if (d.mainWeaknesses) setMainWeaknesses(d.mainWeaknesses);
            if (d.knowsFranchiseDefinition !== undefined) setKnowsFranchiseDefinition(d.knowsFranchiseDefinition ? 'Yes' : 'No');
            if (d.franchiseDefinitionExplanation) setFranchiseDefinitionExplanation(d.franchiseDefinitionExplanation);
            if (d.understandsRelationship !== undefined) setUnderstandsRelationship(d.understandsRelationship ? 'Yes' : 'No');
            if (d.relationshipExplanation) setRelationshipExplanation(d.relationshipExplanation);
            if (d.acceptsGuidance !== undefined) setAcceptsGuidance(d.acceptsGuidance ? 'Yes' : 'No');
            if (d.knowsDefinedTerm !== undefined) setKnowsDefinedTerm(d.knowsDefinedTerm ? 'Yes' : 'No');
            if (d.representationsMade) setRepresentationsMade(d.representationsMade);
            if (d.understandsIndependentAdvice !== undefined) setUnderstandsIndependentAdvice(d.understandsIndependentAdvice ? 'Yes' : 'No');

            // Finance & Info Statement
            if (d.requiresFinance !== undefined) setRequiresFinance(d.requiresFinance ? 'Yes' : 'No');
            if (d.authorizeFinanceSharing !== undefined) setAuthorizeFinanceSharing(d.authorizeFinanceSharing ? 'Yes' : 'No');
            if (d.informationStatementConfirmed !== undefined) setInformationStatementConfirmed(Boolean(d.informationStatementConfirmed));
            if (d.informationStatementDate) setInformationStatementDate(d.informationStatementDate);
          }
        } else {
          setError(json.message || 'EOI token invalid or expired.');
        }
      } catch (err: any) {
        console.error('Failed to load EOI:', err);
        setError('Could not load Expression of Interest form.');
      } finally {
        setLoading(false);
      }
    }
    loadEOI();
  }, [token]);

  // Drawing canvas logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#095c7b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const addEmploymentRow = () => {
    if (employmentHistory.length >= 3) return;
    setEmploymentHistory([...employmentHistory, { occupation: '', position: '', company: '', businessType: '', address: '', contactPerson: '', phone: '', periodOfEmployment: '', commencementDate: '', reasonLeft: '', responsibilities: '' }]);
  };

  const updateEmploymentRow = (idx: number, field: keyof EmploymentEntry, val: string) => {
    const updated = [...employmentHistory];
    updated[idx][field] = val;
    setEmploymentHistory(updated);
  };

  const removeEmploymentRow = (idx: number) => {
    if (employmentHistory.length <= 1) return;
    setEmploymentHistory(employmentHistory.filter((_, i) => i !== idx));
  };

  const updateReferenceRow = (idx: number, field: keyof ReferenceEntry, val: string) => {
    const updated = [...references];
    updated[idx][field] = val;
    setReferences(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature || !canvasRef.current) {
      alert('Please provide your digital signature before submitting.');
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    setSubmitting(true);

    try {
      const formData = {
        entityStructure,
        companyName: companyName.trim(),
        abn: abn.trim(),
        registeredAddress: registeredAddress.trim(),
        businessAddress: businessAddress.trim(),
        phoneHome: phoneHome.trim(),
        phoneBusiness: phoneBusiness.trim(),
        facsimileNo: facsimileNo.trim(),

        // Applicant 1
        applicant1Name: applicant1Name.trim(),
        applicant1Position,
        applicant1PrivateAddress: applicant1PrivateAddress.trim(),
        applicant1PhoneHome: applicant1PhoneHome.trim(),
        applicant1PhoneBusiness: applicant1PhoneBusiness.trim(),
        applicant1Email: applicant1Email.trim(),
        applicant1DriversLicence: applicant1DriversLicence.trim(),
        applicant1DriversLicencePlace: applicant1DriversLicencePlace.trim(),
        driversLicence: applicant1DriversLicence.trim(),
        driversLicencePlaceOfIssue: applicant1DriversLicencePlace.trim(),
        applicant1DateOfBirth,
        applicant1MaritalStatus,
        applicant1SpouseName: applicant1SpouseName.trim(),
        applicant1SpouseAge,
        applicant1ChildrenAges: applicant1ChildrenAges.trim(),
        applicant1SpouseActive: applicant1SpouseActive === 'Yes',
        applicant1OwnershipPercent,
        applicant1OtherDirectorships: applicant1OtherDirectorships.trim(),
        applicant1FormerAddress: applicant1FormerAddress.trim(),
        applicant1HealthStatus,
        applicant1PhysicalLimitations: applicant1PhysicalLimitations.trim(),
        applicant1Qualifications: applicant1Qualifications.trim(),
        applicant1SalesTraining: applicant1SalesTraining.trim(),

        // Applicant 2
        hasApplicant2,
        applicant2Name: applicant2Name.trim(),
        applicant2Position,
        applicant2PrivateAddress: applicant2PrivateAddress.trim(),
        applicant2PhoneHome: applicant2PhoneHome.trim(),
        applicant2PhoneBusiness: applicant2PhoneBusiness.trim(),
        applicant2Email: applicant2Email.trim(),
        applicant2DriversLicence: applicant2DriversLicence.trim(),
        applicant2DriversLicencePlace: applicant2DriversLicencePlace.trim(),
        applicant2DateOfBirth,
        applicant2MaritalStatus,
        applicant2SpouseName: applicant2SpouseName.trim(),
        applicant2SpouseAge,
        applicant2ChildrenAges: applicant2ChildrenAges.trim(),
        applicant2SpouseActive: applicant2SpouseActive === 'Yes',
        applicant2OwnershipPercent,
        applicant2OtherDirectorships: applicant2OtherDirectorships.trim(),
        applicant2FormerAddress: applicant2FormerAddress.trim(),
        applicant2HealthStatus,
        applicant2PhysicalLimitations: applicant2PhysicalLimitations.trim(),
        applicant2Qualifications: applicant2Qualifications.trim(),
        applicant2SalesTraining: applicant2SalesTraining.trim(),

        // Trust
        trustName: trustName.trim(),
        trustEstablishedDate,
        trustBeneficiaries: trustBeneficiaries.trim(),

        // Employment & References
        employmentHistory,
        references,

        // Convictions & Legal
        convictionPlaceYear: convictionPlaceYear.trim(),
        convictionType: convictionType.trim(),
        convictionPenalty: convictionPenalty.trim(),
        plaintiffName: plaintiffName.trim(),
        defendantName: defendantName.trim(),
        yearIssued: yearIssued.trim(),
        yearConcluded: yearConcluded.trim(),
        subjectMatter: subjectMatter.trim(),
        judgmentNatureQuantum: judgmentNatureQuantum.trim(),

        // Income & Expenditure
        incSalary, incBonus, incDividends, incRealEstate, incOther, incOtherSpecify,
        monthlyIncome: calculatedTotalIncome,

        expMortgage, expLoans, expCreditCard, expPhoneElectric, expSchoolFees, expRatesTaxes, expInsurance, expOther, expOtherSpecify,
        monthlyExpenditure: calculatedTotalExpenditure,

        // Assets & Liabilities
        astRealEstate, astCash, astBusinessNetValue, astSharesBonds, astOther,
        totalAssets: calculatedTotalAssets,

        liabRealEstateMortgages, liabNotesLoansInst, liabFriendsRelatives, liabOtherDebts,
        totalLiabilities: calculatedTotalLiabilities,
        netWorth: calculatedNetWorth,

        // General Enquiry
        reasonForPurchase: reasonForPurchase.trim(),
        fundingSource: fundingSource.trim(),
        whySuited: whySuited.trim(),
        similarBusinessExperience: similarBusinessExperience === 'Yes',
        similarBusinessDetails: similarBusinessDetails.trim(),
        preparedToComply: preparedToComply === 'Yes',
        whySuccessful: whySuccessful.trim(),
        valuableQualities: valuableQualities.trim(),
        fullTimeDevotion: fullTimeDevotion === 'Yes',
        operatingHoursDetails: operatingHoursDetails.trim(),
        mainStrengths: mainStrengths.trim(),
        mainWeaknesses: mainWeaknesses.trim(),
        knowsFranchiseDefinition: knowsFranchiseDefinition === 'Yes',
        franchiseDefinitionExplanation: franchiseDefinitionExplanation.trim(),
        understandsRelationship: understandsRelationship === 'Yes',
        relationshipExplanation: relationshipExplanation.trim(),
        acceptsGuidance: acceptsGuidance === 'Yes',
        knowsDefinedTerm: knowsDefinedTerm === 'Yes',
        representationsMade: representationsMade.trim(),
        understandsIndependentAdvice: understandsIndependentAdvice === 'Yes',

        // Finance & Information Statement
        requiresFinance: requiresFinance === 'Yes',
        authorizeFinanceSharing: authorizeFinanceSharing === 'Yes',
        informationStatementConfirmed,
        informationStatementDate,

        declarationConfirmed: true,
      };

      const res = await fetch('/api/eoi/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: applicant1Name || prospectData.fullName,
          signerEmail: applicant1Email || prospectData.email,
          signatureDataUrl,
          formData,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to submit EOI form.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting EOI:', err);
      alert(err.message || 'Failed to submit EOI form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Expression of Interest Form...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-700">Link Invalid or Expired</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid EOI link.'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-emerald-300 shadow-md">
          <CardHeader className="text-center pb-3 bg-emerald-50 border-b rounded-t-xl">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
            <CardTitle className="text-2xl text-emerald-900 font-bold">EOI Form Submitted & Signed</CardTitle>
            <CardDescription className="text-xs text-emerald-700">
              Thank you, {applicant1Name || prospectData.fullName}. Your Expression of Interest has been recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-xs text-slate-600 space-y-4">
            <p>
              Your application details and digital signature have been received by MailPlus Head Office. Our finance and sales team will contact you shortly to confirm your deposit and next steps.
            </p>
            <div className="p-3 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
              Applicant: {applicant1Name || prospectData.fullName} ({applicant1Email || prospectData.email})
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d0dfcd] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#095c7b] text-white rounded-xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="bg-white/10 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Official Application Form
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-2">Expression of Interest Form (EOI)</h1>
              <p className="text-sky-100 text-xs mt-1">MailPlus Franchise Opportunity</p>
            </div>
            <img src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD" alt="MailPlus" className="h-9 hidden sm:block" />
          </div>
          <div className="mt-4 p-3 bg-white/10 rounded-lg text-xs leading-relaxed text-sky-50">
            Thank you for your expression of interest in acquiring a MailPlus Franchise. The attached application is provided to determine your suitability as a MailPlus Franchisee. All information provided will be relied upon and must be true, accurate and not in any way misleading.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Entity Structure & Company Details */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> 1. Applicant Structure & Entity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Current / Proposed Entity Structure <span className="text-red-500">*</span></Label>
                <Select value={entityStructure} onValueChange={(val: any) => setEntityStructure(val)}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLE TRADER">Sole Trader</SelectItem>
                    <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                    <SelectItem value="PTY LTD COMPANY">Pty Ltd Company</SelectItem>
                    <SelectItem value="LTD COMPANY">Ltd Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Name of Applicant / Company Name <span className="text-red-500">*</span></Label>
                  <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ABN (Australian Business Number)</Label>
                  <Input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="e.g. 12 345 678 901" className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Registered Address</Label>
                  <Input value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} placeholder="Registered office address" className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business Address</Label>
                  <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Street, suburb, state, postcode" className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Telephone (Home)</Label>
                  <Input value={phoneHome} onChange={(e) => setPhoneHome(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Telephone (Business / Mobile)</Label>
                  <Input value={phoneBusiness} onChange={(e) => setPhoneBusiness(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Facsimile No.</Label>
                  <Input value={facsimileNo} onChange={(e) => setFacsimileNo(e.target.value)} className="text-xs bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Applicant 1 Details */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <FileText className="h-4 w-4" /> 2. Applicant 1 Personal Details & Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name <span className="text-red-500">*</span></Label>
                  <Input required value={applicant1Name} onChange={(e) => setApplicant1Name(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Position</Label>
                  <Select value={applicant1Position} onValueChange={(val) => setApplicant1Position(val)}>
                    <SelectTrigger className="bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLE TRADER">Sole Trader</SelectItem>
                      <SelectItem value="PARTNER">Partner</SelectItem>
                      <SelectItem value="DIRECTOR">Director</SelectItem>
                      <SelectItem value="SHAREHOLDER">Shareholder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Private Address</Label>
                <Input value={applicant1PrivateAddress} onChange={(e) => setApplicant1PrivateAddress(e.target.value)} className="text-xs bg-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone (Home)</Label>
                  <Input value={applicant1PhoneHome} onChange={(e) => setApplicant1PhoneHome(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone (Business)</Label>
                  <Input value={applicant1PhoneBusiness} onChange={(e) => setApplicant1PhoneBusiness(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input type="email" value={applicant1Email} onChange={(e) => setApplicant1Email(e.target.value)} className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Driver's Licence Number</Label>
                  <Input value={applicant1DriversLicence} onChange={(e) => setApplicant1DriversLicence(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Place of Issue</Label>
                  <Input value={applicant1DriversLicencePlace} onChange={(e) => setApplicant1DriversLicencePlace(e.target.value)} placeholder="e.g. NSW" className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input type="date" value={applicant1DateOfBirth} onChange={(e) => setApplicant1DateOfBirth(e.target.value)} className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Marital Status</Label>
                  <Input value={applicant1MaritalStatus} onChange={(e) => setApplicant1MaritalStatus(e.target.value)} placeholder="Single / Married..." className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Spouse's Name</Label>
                  <Input value={applicant1SpouseName} onChange={(e) => setApplicant1SpouseName(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Spouse's Age</Label>
                  <Input value={applicant1SpouseAge} onChange={(e) => setApplicant1SpouseAge(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Age of Children</Label>
                  <Input value={applicant1ChildrenAges} onChange={(e) => setApplicant1ChildrenAges(e.target.value)} placeholder="e.g. 5, 8" className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">If married, will spouse be active in the business?</Label>
                  <Select value={applicant1SpouseActive} onValueChange={(val) => setApplicant1SpouseActive(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">% Ownership of Business</Label>
                  <Input value={applicant1OwnershipPercent} onChange={(e) => setApplicant1OwnershipPercent(e.target.value)} placeholder="100%" className="text-xs bg-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Other Directorships / Business Interests (Name of company & address)</Label>
                <Input value={applicant1OtherDirectorships} onChange={(e) => setApplicant1OtherDirectorships(e.target.value)} className="text-xs bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Former Address</Label>
                <Input value={applicant1FormerAddress} onChange={(e) => setApplicant1FormerAddress(e.target.value)} className="text-xs bg-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Health Status</Label>
                  <Select value={applicant1HealthStatus} onValueChange={(val) => setApplicant1HealthStatus(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="GOOD">Good</SelectItem><SelectItem value="FAIR">Fair</SelectItem><SelectItem value="POOR">Poor</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Describe Physical / Mental Disabilities or Limitations</Label>
                  <Input value={applicant1PhysicalLimitations} onChange={(e) => setApplicant1PhysicalLimitations(e.target.value)} placeholder="None or details..." className="text-xs bg-white" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Personal Qualifications, Degrees or Diplomas</Label>
                <Input value={applicant1Qualifications} onChange={(e) => setApplicant1Qualifications(e.target.value)} className="text-xs bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Formal Training in Sales, Retailing or Management</Label>
                <Input value={applicant1SalesTraining} onChange={(e) => setApplicant1SalesTraining(e.target.value)} className="text-xs bg-white" />
              </div>
            </CardContent>
          </Card>

          {/* Co-Applicant 2 (Toggleable) */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> Applicant 2 Details (Optional / Partner / Co-Director)
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setHasApplicant2(!hasApplicant2)} className="h-7 text-xs">
                {hasApplicant2 ? 'Remove Applicant 2' : '+ Add Applicant 2'}
              </Button>
            </CardHeader>
            {hasApplicant2 && (
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name</Label>
                    <Input value={applicant2Name} onChange={(e) => setApplicant2Name(e.target.value)} className="text-xs bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Position</Label>
                    <Select value={applicant2Position} onValueChange={(val) => setApplicant2Position(val)}>
                      <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="PARTNER">Partner</SelectItem><SelectItem value="DIRECTOR">Director</SelectItem><SelectItem value="SHAREHOLDER">Shareholder</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Private Address</Label>
                  <Input value={applicant2PrivateAddress} onChange={(e) => setApplicant2PrivateAddress(e.target.value)} className="text-xs bg-white" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Phone (Home)</Label><Input value={applicant2PhoneHome} onChange={(e) => setApplicant2PhoneHome(e.target.value)} className="text-xs bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Phone (Business)</Label><Input value={applicant2PhoneBusiness} onChange={(e) => setApplicant2PhoneBusiness(e.target.value)} className="text-xs bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Email Address</Label><Input type="email" value={applicant2Email} onChange={(e) => setApplicant2Email(e.target.value)} className="text-xs bg-white" /></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Driver's Licence Number</Label><Input value={applicant2DriversLicence} onChange={(e) => setApplicant2DriversLicence(e.target.value)} className="text-xs bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Place of Issue</Label><Input value={applicant2DriversLicencePlace} onChange={(e) => setApplicant2DriversLicencePlace(e.target.value)} className="text-xs bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-semibold">Date of Birth</Label><Input type="date" value={applicant2DateOfBirth} onChange={(e) => setApplicant2DateOfBirth(e.target.value)} className="text-xs bg-white" /></div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 3. Trusts */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">3. Trust Details (If Applicant is a Trustee)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Name of Trust</Label>
                  <Input value={trustName} onChange={(e) => setTrustName(e.target.value)} className="text-xs bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date Trust Established</Label>
                  <Input type="date" value={trustEstablishedDate} onChange={(e) => setTrustEstablishedDate(e.target.value)} className="text-xs bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Names of Beneficiaries / Unitholders</Label>
                <textarea rows={2} value={trustBeneficiaries} onChange={(e) => setTrustBeneficiaries(e.target.value)} className="w-full p-2 text-xs border rounded bg-white" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Employment History */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#095c7b]">4. Previous Employment History</CardTitle>
              {employmentHistory.length < 3 && (
                <Button type="button" variant="outline" size="sm" onClick={addEmploymentRow} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Entry ({employmentHistory.length}/3)
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {employmentHistory.map((row, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border rounded-lg space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#095c7b] uppercase">Employment Entry #{idx + 1}</span>
                    {employmentHistory.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeEmploymentRow(idx)} className="h-6 w-6 p-0 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-[11px]">Occupation</Label><Input value={row.occupation} onChange={(e) => updateEmploymentRow(idx, 'occupation', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Position</Label><Input value={row.position} onChange={(e) => updateEmploymentRow(idx, 'position', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Company Name</Label><Input value={row.company} onChange={(e) => updateEmploymentRow(idx, 'company', e.target.value)} className="text-xs bg-white" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-[11px]">Type of Business</Label><Input value={row.businessType} onChange={(e) => updateEmploymentRow(idx, 'businessType', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Contact Person</Label><Input value={row.contactPerson} onChange={(e) => updateEmploymentRow(idx, 'contactPerson', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Telephone No.</Label><Input value={row.phone} onChange={(e) => updateEmploymentRow(idx, 'phone', e.target.value)} className="text-xs bg-white" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label className="text-[11px]">Period of Employment / Dates</Label><Input value={row.periodOfEmployment} onChange={(e) => updateEmploymentRow(idx, 'periodOfEmployment', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Reason Left</Label><Input value={row.reasonLeft} onChange={(e) => updateEmploymentRow(idx, 'reasonLeft', e.target.value)} className="text-xs bg-white" /></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. References */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">5. References (2 Trade References & 1 Personal Reference)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {references.map((ref, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border rounded-lg space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">{ref.nature}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div><Label className="text-[11px]">Name</Label><Input value={ref.name} onChange={(e) => updateReferenceRow(idx, 'name', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Telephone</Label><Input value={ref.phone} onChange={(e) => updateReferenceRow(idx, 'phone', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Position</Label><Input value={ref.position} onChange={(e) => updateReferenceRow(idx, 'position', e.target.value)} className="text-xs bg-white" /></div>
                    <div><Label className="text-[11px]">Company</Label><Input value={ref.company} onChange={(e) => updateReferenceRow(idx, 'company', e.target.value)} className="text-xs bg-white" /></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 6. Convictions & Legal Proceedings */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">6. Convictions and Legal Proceedings</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-2 p-3 bg-slate-50 rounded border">
                <span className="font-semibold text-slate-800 block">Personal Convictions (if any, in Australia or elsewhere):</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label className="text-[11px]">Place & Year</Label><Input value={convictionPlaceYear} onChange={(e) => setConvictionPlaceYear(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Type of Offence</Label><Input value={convictionType} onChange={(e) => setConvictionType(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Penalty</Label><Input value={convictionPenalty} onChange={(e) => setConvictionPenalty(e.target.value)} className="text-xs bg-white" /></div>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded border">
                <span className="font-semibold text-slate-800 block">Legal or Administrative Proceedings:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div><Label className="text-[11px]">Plaintiff</Label><Input value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Defendant</Label><Input value={defendantName} onChange={(e) => setDefendantName(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Year Issued</Label><Input value={yearIssued} onChange={(e) => setYearIssued(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Year Concluded</Label><Input value={yearConcluded} onChange={(e) => setYearConcluded(e.target.value)} className="text-xs bg-white" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div><Label className="text-[11px]">Subject Matter</Label><Input value={subjectMatter} onChange={(e) => setSubjectMatter(e.target.value)} className="text-xs bg-white" /></div>
                  <div><Label className="text-[11px]">Nature & Quantum of Judgment</Label><Input value={judgmentNatureQuantum} onChange={(e) => setJudgmentNatureQuantum(e.target.value)} className="text-xs bg-white" /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. Monthly Household Income & Expenditure */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">7. Monthly Household Income & Expenditure Breakdown ($)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Income */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                  <span className="font-bold text-emerald-900 block border-b pb-1">Monthly Income ($)</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center"><span>Total salary/wages</span><Input type="number" value={incSalary} onChange={(e) => setIncSalary(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Bonus/Commissions</span><Input type="number" value={incBonus} onChange={(e) => setIncBonus(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Dividends/Interest</span><Input type="number" value={incDividends} onChange={(e) => setIncDividends(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Real Estate Income</span><Input type="number" value={incRealEstate} onChange={(e) => setIncRealEstate(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Other income</span><Input type="number" value={incOther} onChange={(e) => setIncOther(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="pt-2 border-t flex justify-between items-center font-bold text-emerald-950">
                      <span>TOTAL MONTHLY INCOME</span>
                      <span className="text-sm">${calculatedTotalIncome.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Expenditure */}
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-lg space-y-2">
                  <span className="font-bold text-rose-900 block border-b pb-1">Monthly Expenditure ($)</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center"><span>Mortgage repayments</span><Input type="number" value={expMortgage} onChange={(e) => setExpMortgage(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Finance/Loan repayments</span><Input type="number" value={expLoans} onChange={(e) => setExpLoans(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Credit card repayments</span><Input type="number" value={expCreditCard} onChange={(e) => setExpCreditCard(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Telephone/electricity</span><Input type="number" value={expPhoneElectric} onChange={(e) => setExpPhoneElectric(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>School fees & expenses</span><Input type="number" value={expSchoolFees} onChange={(e) => setExpSchoolFees(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Rates, taxes & insurance</span><Input type="number" value={expRatesTaxes} onChange={(e) => setExpRatesTaxes(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Other expenditure</span><Input type="number" value={expOther} onChange={(e) => setExpOther(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="pt-2 border-t flex justify-between items-center font-bold text-rose-950">
                      <span>TOTAL MONTHLY EXPENDITURE</span>
                      <span className="text-sm">${calculatedTotalExpenditure.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Statement of Assets & Liabilities */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">8. Statement of Assets and Liabilities ($)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Assets */}
                <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-lg space-y-2">
                  <span className="font-bold text-sky-900 block border-b pb-1">ASSETS ($)</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center"><span>Real Estate (market value)</span><Input type="number" value={astRealEstate} onChange={(e) => setAstRealEstate(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Cash on Hand / Banks</span><Input type="number" value={astCash} onChange={(e) => setAstCash(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Net value of business interests</span><Input type="number" value={astBusinessNetValue} onChange={(e) => setAstBusinessNetValue(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Shares / bonds / debentures</span><Input type="number" value={astSharesBonds} onChange={(e) => setAstSharesBonds(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Other assets</span><Input type="number" value={astOther} onChange={(e) => setAstOther(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="pt-2 border-t flex justify-between items-center font-bold text-sky-950">
                      <span>(A) TOTAL ASSETS</span>
                      <span className="text-sm">${calculatedTotalAssets.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2">
                  <span className="font-bold text-amber-900 block border-b pb-1">LIABILITIES ($)</span>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center"><span>Real Estate & Mortgages</span><Input type="number" value={liabRealEstateMortgages} onChange={(e) => setLiabRealEstateMortgages(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Bank & Financial Loans</span><Input type="number" value={liabNotesLoansInst} onChange={(e) => setLiabNotesLoansInst(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Loans from friends/relatives</span><Input type="number" value={liabFriendsRelatives} onChange={(e) => setLiabFriendsRelatives(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="flex justify-between items-center"><span>Other debts & obligations</span><Input type="number" value={liabOtherDebts} onChange={(e) => setLiabOtherDebts(e.target.value)} className="w-32 h-7 text-xs bg-white" /></div>
                    <div className="pt-2 border-t flex justify-between items-center font-bold text-amber-950">
                      <span>(B) TOTAL LIABILITIES</span>
                      <span className="text-sm">${calculatedTotalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Worth Summary Box */}
              <div className="p-4 bg-[#095c7b] text-white rounded-lg flex items-center justify-between font-bold">
                <span>(C) ESTIMATED NET WORTH (A - B):</span>
                <span className="text-xl text-[#eaf143]">${calculatedNetWorth.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* 9. General Enquiry by MailPlus */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">9. General Enquiry & Evaluation Questionnaire</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">1. Why do you want to buy a MailPlus Franchise, and what features attracted you?</Label>
                <textarea rows={2} value={reasonForPurchase} onChange={(e) => setReasonForPurchase(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">2. How do you intend to fund the purchase of the MailPlus Franchise?</Label>
                <textarea rows={2} value={fundingSource} onChange={(e) => setFundingSource(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">3. Why do you believe you are suited to operating a MailPlus Franchise?</Label>
                <textarea rows={2} value={whySuited} onChange={(e) => setWhySuited(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">4. Owned or worked in a similar business?</Label>
                  <Select value={similarBusinessExperience} onValueChange={(val) => setSimilarBusinessExperience(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                {similarBusinessExperience === 'Yes' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">If yes, provide details (Name, address, phone)</Label>
                    <Input value={similarBusinessDetails} onChange={(e) => setSimilarBusinessDetails(e.target.value)} className="text-xs bg-white" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">5. Are you prepared to comply with procedures and controls set by MailPlus?</Label>
                <Select value={preparedToComply} onValueChange={(val) => setPreparedToComply(val)}>
                  <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">6. Why do you think you will be successful?</Label>
                <textarea rows={2} value={whySuccessful} onChange={(e) => setWhySuccessful(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">7. What qualities do you have that are valuable to the MailPlus network?</Label>
                <textarea rows={2} value={valuableQualities} onChange={(e) => setValuableQualities(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">8. Will you devote your full time to the business?</Label>
                  <Select value={fullTimeDevotion} onValueChange={(val) => setFullTimeDevotion(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes - Full Time</SelectItem><SelectItem value="No">No - Part Time / Management</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hours per day / Days per week (or operational plan):</Label>
                  <Input value={operatingHoursDetails} onChange={(e) => setOperatingHoursDetails(e.target.value)} placeholder="e.g. 8 hrs/day, 5 days/wk" className="text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs font-semibold">9. Main Strengths</Label><Input value={mainStrengths} onChange={(e) => setMainStrengths(e.target.value)} className="text-xs bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">10. Main Weaknesses</Label><Input value={mainWeaknesses} onChange={(e) => setMainWeaknesses(e.target.value)} className="text-xs bg-white" /></div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">11. Do you know what a Franchise is? Explain:</Label>
                <textarea rows={2} value={franchiseDefinitionExplanation} onChange={(e) => setFranchiseDefinitionExplanation(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">12. Explain the nature of the Franchisor / Franchisee relationship:</Label>
                <textarea rows={2} value={relationshipExplanation} onChange={(e) => setRelationshipExplanation(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">13. Comfortable working under guidance & direction of Franchisor?</Label>
                  <Select value={acceptsGuidance} onValueChange={(val) => setAcceptsGuidance(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">14. Understand franchise is granted for defined term without mandatory renewal?</Label>
                  <Select value={knowsDefinedTerm} onValueChange={(val) => setKnowsDefinedTerm(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">15. What representations have been made to you and by whom?</Label>
                <textarea rows={2} value={representationsMade} onChange={(e) => setRepresentationsMade(e.target.value)} className="w-full p-2 border rounded bg-white" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">16. Do you understand you must make your own enquiries and get independent advice?</Label>
                <Select value={understandsIndependentAdvice} onValueChange={(val) => setUnderstandsIndependentAdvice(val)}>
                  <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 10. Supporting Information Requirements */}
          <Card className="shadow-sm border bg-sky-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <Info className="h-4 w-4" /> 10. Supporting Information Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>Please note that MailPlus may request the following supporting documents prior to final approval:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>If operating via a company: Company Constitution and Certificate of Incorporation.</li>
                <li>If trustee of a Trust: Copy of the Trust Deed.</li>
                <li>If previously operated a business: Profit & Loss Statement and Balance Sheet for the last 3 years.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 11. Application Steps Roadmap */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b]">11. MailPlus Franchise Application Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-slate-700 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">1. EOI & Deposit</strong>Complete EOI form and submit 5% deposit.</div>
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">2. Discovery Call</strong>MailPlus team contacts you to discuss.</div>
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">3. Ride Along</strong>Experience the business in action.</div>
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">4. Territory Growth</strong>Sales team discusses territory expansion.</div>
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">5. Finance Review</strong>Finance team answers structural questions.</div>
                <div className="p-3 bg-white border rounded shadow-xs"><strong className="text-[#095c7b] block">6. MD Interview</strong>Final interview with Founder & MD Chris Burgess.</div>
              </div>
            </CardContent>
          </Card>

          {/* 12 & 13. Deposit, Finance Sharing & Info Statement */}
          <Card className="shadow-sm border border-amber-300 bg-amber-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-700" /> 12. Deposit, Finance Sharing & Information Statement Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-amber-950 space-y-4">
              <div className="bg-white p-3 border border-amber-200 rounded-md font-mono text-[11px] space-y-1 text-slate-800">
                <div>Financial Institution: <strong>NAB</strong></div>
                <div>Account Name: <strong>Mail Plus Pty Ltd</strong></div>
                <div>BSB: <strong>082-057</strong> | Account Number: <strong>929905271</strong></div>
                <div>Transaction Description: <strong>"FR DEP '{applicant1Name || prospectData.lastName || 'SURNAME'}'"</strong></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Will you require finance to assist in purchase?</Label>
                  <Select value={requiresFinance} onValueChange={(val) => setRequiresFinance(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Authorise MailPlus to share EOI with banking partners?</Label>
                  <Select value={authorizeFinanceSharing} onValueChange={(val) => setAuthorizeFinanceSharing(val)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="infoStatementCheck"
                    checked={informationStatementConfirmed}
                    onChange={(e) => setInformationStatementConfirmed(e.target.checked)}
                    className="h-4 w-4 text-[#095c7b] rounded border-amber-400"
                  />
                  <label htmlFor="infoStatementCheck" className="font-semibold text-xs text-amber-950 cursor-pointer">
                    I confirm receipt of the Information Statement for Prospective Franchisees
                  </label>
                </div>
                <div className="w-48">
                  <Label className="text-[11px]">Receipt Date</Label>
                  <Input type="date" value={informationStatementDate} onChange={(e) => setInformationStatementDate(e.target.value)} className="text-xs bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 14. Digital Signature & Declaration */}
          <Card className="shadow-md border">
            <CardHeader className="bg-slate-50 border-b pb-3">
              <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
                <PenTool className="h-4 w-4" /> 14. Declaration & Digital Signature
              </CardTitle>
              <CardDescription className="text-xs">
                The information as provided herein is a true and accurate account of the facts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">
                  Draw Signature Below <span className="text-red-500">*</span>
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="h-6 text-[11px] text-slate-500 gap-1">
                  <RefreshCw className="h-3 w-3" /> Clear
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full bg-white rounded cursor-crosshair"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !hasSignature}
                className="w-full bg-[#095c7b] hover:bg-[#074760] text-white py-3 font-bold text-sm shadow"
              >
                {submitting ? <Loader className="h-4 w-4 mr-2" /> : null}
                Submit & Sign Expression of Interest
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
