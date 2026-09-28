from contextlib import contextmanager
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi import File, HTTPException, UploadFile, status

from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from apps.experts.models import Expert
from apps.experts.schemas import ExpertCreate, ExpertInfor, ExpertUpdate
from apps.investments.models import Investment
from apps.investments.schemas import InvestmentCreate, InvestmentList, InvestmentUpdate, ProposalSchema
from config.database import DatabaseManager


class InvestmentServices:
    """Service class for managing investment operations"""
    @staticmethod
    @contextmanager
    def get_db_session():
        """Context manager for database sessions"""
        session = DatabaseManager.session
        try:
            yield session
        finally:
            session.close()

    @classmethod
    def get_investments(cls) -> List[InvestmentList]:
        """Get a list of all investments"""
        try:
            with cls.get_db_session() as session:
                investments = session.query(Investment).all()
                return [InvestmentList(**investment.__dict__) for investment in investments] if investments else []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve experts: {str(e)}",
            )

    @classmethod
    def get_by_id(cls, id: str) -> Investment:
        """Get an investment by its ID"""
        try:
            with cls.get_db_session() as session:
                investment = session.query(Investment).filter(Investment.id == id).first()
                if investment:
                    return investment
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Investment with ID {id} not found",
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve expert: {str(e)}",
            )

    @staticmethod
    def delete_file_url(url: str) -> None:
        if url:
            try:
                StorageService.delete_image(url)
            except Exception:
                pass

    @classmethod
    def create_investment(cls, data: InvestmentCreate):
        """Create a new investment"""
        try:
            with cls.get_db_session() as session:
                investment = Investment.create(
                    businessName = data.businessName,
                    city = data.city,
                    district = data.district,
                    fullAddress = data.fullAddress,
                    proposal = {
                        "sector": data.sector,
                        "structure": data.structure,
                        "stage": data.stage,
                        "amount": data.amount,
                        "customAmount": data.customAmount,
                        "investmentType": data.investmentType,
                        "valuation": data.valuation,
                        "useOfFunds": data.useOfFunds,

                        "description": data.description,
                        "usp": data.usp,
                        "locationAdvantage": data.locationAdvantage,
                        "currentPerformance": data.currentPerformance,
                        "revenue": data.revenue,
                        "netProfit": data.netProfit,
                        "projected": data.projected,
                        "targetMarket": data.targetMarket,
                        "marketTrends": data.marketTrends,
                        "competitiveLandscape": data.competitiveLandscape,

                        "keyProducts": data.keyProducts,
                        "businessModel": data.businessModel,
                        "team": data.team,
                        "lastAudit": data.lastAudit,
                        "auditingFirm": data.auditingFirm,
                        "willingAudit": data.willingAudit,
                        "managementAccounts": data.managementAccounts,
                        "expansionTimeline": data.expansionTimeline,
                        "keyMilestones": data.keyMilestones,
                        "equipment": data.equipment,
                        "renovation": data.renovation,
                        "marketing": data.marketing,
                        "workingCapital": data.workingCapital,
                        "total": data.total,
                        "notes": data.notes,
                        "openVisits": data.openVisits,
                        "preferredTiming": data.preferredTiming,
                        "confidentiality": data.confidentiality,
                        "licenses": data.licenses,
                        "photos": data.photos,
                        "pitchDeck": data.pitchDeck,
                        "investorTerms": data.investorTerms,
                        "contactPerson": data.contactPerson,
                        "phone": data.phone,
                        "email": data.email,
                        "preferredNextStep": data.preferredNextStep
                    }
                )
                return { "id": investment.id}
        except IntegrityError:
           
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Investment already exists",
            )
        except Exception as e:
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create expert: {str(e)}",
            )
        
    @classmethod
    def update_investment(cls, id: str, data: Optional[InvestmentUpdate] = None):
        """Update an existing investment"""
        try:
            with cls.get_db_session() as session:
                investment = session.query(Investment).filter(Investment.id == id).first()
                if not investment:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Investment with ID {id} not found",
                    )
                update_data = {"modifiedAt": DateTime.now()}
                if data:
                    update_data["businessName"] = data.businessName if data.businessName else investment.businessName
                    update_data["city"] = data.city if data.city else investment.city
                    update_data["district"] = data.district if data.district else investment.district
                    update_data["fullAddress"] = data.fullAddress if data.fullAddress else investment.fullAddress
                    update_data["status"] = data.status if data.status else investment.status

                    proposal = investment.proposal

                    new_proposal = {
                        "sector": data.sector or proposal.get("sector"),
                        "structure": data.structure or proposal.get("structure"),
                        "stage": data.stage or proposal.get("stage"),
                        "amount": data.amount or proposal.get("amount"),
                        "customAmount": data.customAmount or proposal.get("customAmount"),
                        "investmentType": data.investmentType or proposal.get("investmentType"),
                        "valuation": data.valuation or proposal.get("valuation"),
                        "useOfFunds": data.useOfFunds or proposal.get("useOfFunds"),

                        "description": data.description or proposal.get("description"),
                        "usp": data.usp or proposal.get("usp"),
                        "locationAdvantage": data.locationAdvantage or proposal.get("locationAdvantage"),
                        "currentPerformance": data.currentPerformance or proposal.get("currentPerformance"),
                        "revenue": data.revenue or proposal.get("revenue"),
                        "netProfit": data.netProfit or proposal.get("netProfit"),
                        "projected": data.projected or proposal.get("projected"),
                        "targetMarket": data.targetMarket or proposal.get("targetMarket"),
                        "marketTrends": data.marketTrends or proposal.get("marketTrends"),
                        "competitiveLandscape": data.competitiveLandscape or proposal.get("competitiveLandscape"),

                        "keyProducts": data.keyProducts or proposal.get("keyProducts"),
                        "businessModel": data.businessModel or proposal.get("businessModel"),
                        "team": data.team or proposal.get("team"),
                        "lastAudit": data.lastAudit or proposal.get("lastAudit"),
                        "auditingFirm": data.auditingFirm or proposal.get("auditingFirm"),
                        "willingAudit": data.willingAudit or proposal.get("willingAudit"),
                        "managementAccounts": data.managementAccounts or proposal.get("managementAccounts"),
                        "expansionTimeline": data.expansionTimeline or proposal.get("expansionTimeline"),
                        "keyMilestones": data.keyMilestones or proposal.get("keyMilestones"),
                        "equipment": data.equipment or proposal.get("equipment"),
                        "renovation": data.renovation or proposal.get("renovation"),
                        "marketing": data.marketing or proposal.get("marketing"),
                        "workingCapital": data.workingCapital or proposal.get("workingCapital"),
                        "total": data.total or proposal.get("total"),
                        "notes": data.notes or proposal.get("notes"),
                        "openVisits": data.openVisits or proposal.get("openVisits"),
                        "preferredTiming": data.preferredTiming or proposal.get("preferredTiming"),
                        "confidentiality": data.confidentiality or proposal.get("confidentiality"),
                        "licenses": data.licenses or proposal.get("licenses"),
                        "photos": data.photos or proposal.get("photos"),
                        "pitchDeck": data.pitchDeck or proposal.get("pitchDeck"),
                        "investorTerms": data.investorTerms or proposal.get("investorTerms"),
                        "contactPerson": data.contactPerson or proposal.get("contactPerson"),
                        "phone": data.phone or proposal.get("phone"),
                        "email": data.email or proposal.get("email"),
                        "preferredNextStep": data.preferredNextStep or proposal.get("preferredNextStep")
                    }
                    update_data["proposal"] = new_proposal
                    
                return Investment.update(id, **update_data)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update investment: {str(e)}",
            )
    
    @classmethod
    def delete_investment(cls, id: str) -> dict:
        """Delete an investment by its ID"""
        try:
            with cls.get_db_session() as session:
                investment = session.query(Investment).filter(Investment.id == id).first()
                if not investment:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Investment with ID {id} not found",
                    )
                cls.delete_file_url(investment.proposal["photos"])
                session.delete(investment)
                session.commit()
                return {"detail": "Investment deleted successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete investment: {str(e)}",
            )
    
    @classmethod
    def update_status(cls, id: str, Istatus: str):
        with cls.get_db_session() as session:
            investment = session.query(Investment).filter(Investment.id == id).first()
            if not investment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Investment with ID {id} not found",
                )
            Investment.update(id, status = Istatus)
            return {"message": "Update investment status successfully"}