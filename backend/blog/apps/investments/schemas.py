from enum import Enum
from typing import Optional, List
from pydantic import BaseModel

class InvestmentStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ProposalSchema(BaseModel):
    sector : str
    structure : str
    stage : str
    amount : str
    customAmount : Optional[str] = None
    investmentType : str
    valuation : Optional[str] = None
    useOfFunds : str

    description : str
    usp : str
    locationAdvantage : str
    currentPerformance : str
    revenue : str
    netProfit : str
    projected : str
    targetMarket : str
    marketTrends : str
    competitiveLandscape : str

    keyProducts : str
    businessModel : str
    team : str
    lastAudit : Optional[str] = None
    auditingFirm : Optional[str] = None
    willingAudit : str
    managementAccounts : str
    expansionTimeline : str
    keyMilestones : str
    equipment : str
    renovation : str
    marketing : str
    workingCapital : str
    total : str
    notes : str
    openVisits : str
    preferredTiming : Optional[str] = None
    confidentiality : Optional[str] = None
    licenses : str
    photos : Optional[str] = None
    pitchDeck : str
    investorTerms : Optional[str] = None
    contactPerson : str
    phone : str
    email : str
    preferredNextStep : str

class InvestmentCreate(BaseModel):
    businessName: str
    city: str
    fullAddress: Optional[str] = None
    district: Optional[str] = None

    sector : str
    structure : str
    stage : str
    amount : str
    customAmount : Optional[str] = None
    investmentType : str
    valuation : Optional[str] = None
    useOfFunds : str

    description : str
    usp : str
    locationAdvantage : str
    currentPerformance : str
    revenue : str
    netProfit : str
    projected : str
    targetMarket : str
    marketTrends : str
    competitiveLandscape : str

    keyProducts : str
    businessModel : str
    team : str
    lastAudit : Optional[str] = None
    auditingFirm : Optional[str] = None
    willingAudit : str
    managementAccounts : str
    expansionTimeline : str
    keyMilestones : str
    equipment : str
    renovation : str
    marketing : str
    workingCapital : str
    total : str
    notes : str
    openVisits : str
    preferredTiming : Optional[str] = None
    confidentiality : Optional[str] = None
    licenses : str
    photos : Optional[str] = None
    pitchDeck : str
    investorTerms : Optional[str] = None
    contactPerson : str
    phone : str
    email : str
    preferredNextStep : str

class InvestmentUpdate(BaseModel):
    businessName: Optional[str] = None
    city: Optional[str] = None
    fullAddress: Optional[str] = None
    district: Optional[str] = None

    sector : Optional[str] = None
    structure : Optional[str] = None
    stage : Optional[str] = None
    amount : Optional[str] = None
    customAmount : Optional[str] = None
    investmentType : Optional[str] = None
    valuation : Optional[str] = None
    useOfFunds : Optional[str] = None

    description : Optional[str] = None
    usp : Optional[str] = None
    locationAdvantage : Optional[str] = None
    currentPerformance : Optional[str] = None
    revenue : Optional[str] = None
    netProfit : Optional[str] = None
    projected : Optional[str] = None
    targetMarket : Optional[str] = None
    marketTrends : Optional[str] = None
    competitiveLandscape : Optional[str] = None

    keyProducts : Optional[str] = None
    businessModel : Optional[str] = None
    team : Optional[str] = None
    lastAudit : Optional[str] = None
    auditingFirm : Optional[str] = None
    willingAudit : Optional[str] = None
    managementAccounts : Optional[str] = None
    expansionTimeline : Optional[str] = None
    keyMilestones : Optional[str] = None
    equipment : Optional[str] = None
    renovation : Optional[str] = None
    marketing : Optional[str] = None
    workingCapital : Optional[str] = None
    total : Optional[str] = None
    notes : Optional[str] = None
    openVisits : Optional[str] = None
    preferredTiming : Optional[str] = None
    confidentiality : Optional[str] = None
    licenses : Optional[str] = None
    photos : Optional[str] = None
    pitchDeck : Optional[str] = None
    investorTerms : Optional[str] = None
    contactPerson : Optional[str] = None
    phone : Optional[str] = None
    email : Optional[str] = None
    preferredNextStep : Optional[str] = None
    status: Optional[InvestmentStatus] = None

class InvestmentList(BaseModel):
    id: str
    businessName: str
    city: str
    district: Optional[str] = None

class InvestmentUpdateStt(BaseModel):
    id: str
    status: InvestmentStatus