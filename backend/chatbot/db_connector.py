"""
============================================================================
DATABASE CONNECTOR - Consultas directas a PostgreSQL para MCP
============================================================================
Proporciona funciones para consultar datos de staff, consultas y SERGAS
directamente desde PostgreSQL para uso del servidor MCP.
============================================================================
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.models import get_session, Staff, Consulta, ListaSergas

logger = logging.getLogger(__name__)


class DatabaseConnector:
    """Conector de base de datos para el servidor MCP"""

    def __init__(self):
        self._session = None

    def _get_session(self):
        """Obtiene o crea una sesión de base de datos"""
        if self._session is None:
            try:
                self._session = get_session()
            except Exception as e:
                logger.error(f"Error conectando a la base de datos: {e}")
                return None
        return self._session

    def _safe_query(self, query_func):
        """Ejecuta una query de forma segura, manejando errores"""
        try:
            session = self._get_session()
            if session is None:
                return None
            return query_func(session)
        except Exception as e:
            logger.error(f"Error en query: {e}")
            # Resetear sesión en caso de error
            self._session = None
            return None

    # ========================================================================
    # STAFF QUERIES
    # ========================================================================

    def get_all_staff(self) -> Dict[str, List[Dict]]:
        """
        Obtiene todo el personal agrupado por hospital.
        
        Returns:
            Dict con hospital_id como clave y lista de staff como valor
        """
        def query(session):
            staff_list = session.query(Staff).all()
            result = {}
            for s in staff_list:
                hospital = s.hospital_id
                if hospital not in result:
                    result[hospital] = []
                result[hospital].append(s.to_dict())
            return result

        return self._safe_query(query) or {}

    def get_staff_by_hospital(self, hospital_id: str) -> List[Dict]:
        """
        Obtiene el personal de un hospital específico.
        
        Args:
            hospital_id: ID del hospital (chuac, modelo, san_rafael)
            
        Returns:
            Lista de personal del hospital
        """
        def query(session):
            staff_list = session.query(Staff).filter(
                Staff.hospital_id == hospital_id
            ).all()
            return [s.to_dict() for s in staff_list]

        return self._safe_query(query) or []

    def get_staff_summary(self) -> Dict[str, Any]:
        """
        Obtiene un resumen del personal por hospital y rol.
        
        Returns:
            Dict con resumen de personal
        """
        def query(session):
            staff_list = session.query(Staff).all()
            
            # Totales globales
            totals = {"celador": 0, "enfermeria": 0, "medico": 0}
            
            # Por hospital
            by_hospital = {}
            
            for s in staff_list:
                hospital = s.hospital_id
                rol = s.rol
                
                # Inicializar hospital si no existe
                if hospital not in by_hospital:
                    by_hospital[hospital] = {
                        "celador": 0,
                        "enfermeria": 0,
                        "medico": 0,
                        "available": 0,
                        "busy": 0,
                        "total": 0
                    }
                
                # Contar
                by_hospital[hospital][rol] += 1
                by_hospital[hospital]["total"] += 1
                totals[rol] += 1
                
                # Estado
                if s.estado == "available":
                    by_hospital[hospital]["available"] += 1
                elif s.estado == "busy":
                    by_hospital[hospital]["busy"] += 1
            
            return {
                "totales": {
                    "celadores": totals["celador"],
                    "enfermeras": totals["enfermeria"],
                    "medicos": totals["medico"],
                    "total": sum(totals.values())
                },
                "por_hospital": by_hospital,
                "timestamp": datetime.now().isoformat()
            }

        return self._safe_query(query) or {"totales": {}, "por_hospital": {}}

    # ========================================================================
    # CONSULTAS QUERIES
    # ========================================================================

    def get_consultas_status(self) -> Dict[str, List[Dict]]:
        """
        Obtiene el estado de las consultas por hospital.
        
        Returns:
            Dict con hospital_id como clave y lista de consultas como valor
        """
        def query(session):
            consultas = session.query(Consulta).order_by(
                Consulta.hospital_id, Consulta.numero_consulta
            ).all()
            
            result = {}
            for c in consultas:
                hospital = c.hospital_id
                if hospital not in result:
                    result[hospital] = []
                result[hospital].append(c.to_dict())
            return result

        return self._safe_query(query) or {}

    def get_consulta_by_hospital(self, hospital_id: str) -> List[Dict]:
        """
        Obtiene las consultas de un hospital específico.
        """
        def query(session):
            consultas = session.query(Consulta).filter(
                Consulta.hospital_id == hospital_id
            ).order_by(Consulta.numero_consulta).all()
            return [c.to_dict() for c in consultas]

        return self._safe_query(query) or []

    # ========================================================================
    # SERGAS QUERIES
    # ========================================================================

    def get_sergas_list(self) -> Dict[str, List[Dict]]:
        """
        Obtiene la lista SERGAS dividida en disponibles y asignados.
        
        Returns:
            Dict con 'disponibles' y 'asignados' como claves
        """
        def query(session):
            medicos = session.query(ListaSergas).all()
            
            disponibles = []
            asignados = []
            
            for m in medicos:
                data = m.to_dict()
                if m.disponible:
                    disponibles.append(data)
                else:
                    asignados.append(data)
            
            return {
                "disponibles": disponibles,
                "asignados": asignados,
                "total_disponibles": len(disponibles),
                "total_asignados": len(asignados)
            }

        return self._safe_query(query) or {"disponibles": [], "asignados": []}

    def get_sergas_summary(self) -> Dict[str, Any]:
        """
        Obtiene un resumen de la lista SERGAS.
        """
        def query(session):
            medicos = session.query(ListaSergas).all()
            
            by_especialidad = {}
            disponibles = 0
            asignados = 0
            
            for m in medicos:
                esp = m.especialidad or "General"
                if esp not in by_especialidad:
                    by_especialidad[esp] = {"disponibles": 0, "asignados": 0}
                
                if m.disponible:
                    disponibles += 1
                    by_especialidad[esp]["disponibles"] += 1
                else:
                    asignados += 1
                    by_especialidad[esp]["asignados"] += 1
            
            return {
                "total": len(medicos),
                "disponibles": disponibles,
                "asignados": asignados,
                "por_especialidad": by_especialidad
            }

        return self._safe_query(query) or {"total": 0, "disponibles": 0, "asignados": 0}

    # ========================================================================
    # COMPLETE DATA
    # ========================================================================

    def get_complete_database_snapshot(self) -> Dict[str, Any]:
        """
        Obtiene un snapshot completo de todos los datos de la base de datos.
        
        Returns:
            Dict con todos los datos de PostgreSQL
        """
        return {
            "staff_summary": self.get_staff_summary(),
            "consultas": self.get_consultas_status(),
            "sergas": self.get_sergas_list(),
            "sergas_summary": self.get_sergas_summary(),
            "timestamp": datetime.now().isoformat()
        }

    def close(self):
        """Cierra la sesión de base de datos"""
        if self._session:
            self._session.close()
            self._session = None


# Instancia global para uso en el servidor MCP
db_connector = DatabaseConnector()
