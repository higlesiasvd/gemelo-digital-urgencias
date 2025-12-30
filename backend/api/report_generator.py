"""
============================================================================
PDF REPORT GENERATOR - Hospital Digital Twin
============================================================================
Generates visual PDF reports with hospital metrics using ReportLab.
============================================================================
"""

import io
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
import numpy as np

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import math
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, HRFlowable
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics import renderPDF

logger = logging.getLogger(__name__)

def _safe_float(value, default=0.0):
    """Safely convert value to float, handling NaN/Inf."""
    try:
        val = float(value)
        if math.isnan(val) or math.isinf(val):
            return default
        return val
    except:
        return default

def _safe_int(value, default=0):
    """Safely convert value to int, handling NaN/Inf."""
    try:
        val = float(value)
        if math.isnan(val) or math.isinf(val):
            return default
        return int(val)
    except:
        return default

# ============================================================================
# COLOR PALETTE - Modern Healthcare Theme
# ============================================================================
COLORS = {
    'primary': colors.HexColor('#228BE6'),      # Blue
    'secondary': colors.HexColor('#12B886'),    # Teal
    'accent': colors.HexColor('#7950F2'),       # Violet
    'warning': colors.HexColor('#FD7E14'),      # Orange
    'danger': colors.HexColor('#FA5252'),       # Red
    'success': colors.HexColor('#40C057'),      # Green
    'dark': colors.HexColor('#1A1B1E'),         # Dark
    'gray': colors.HexColor('#868E96'),         # Gray
    'light_gray': colors.HexColor('#DEE2E6'),   # Light Gray
    'light': colors.HexColor('#F8F9FA'),        # Light
    'white': colors.white,
    'gradient_start': colors.HexColor('#1864AB'),
    'gradient_end': colors.HexColor('#228BE6'),
}

HOSPITAL_COLORS = {
    'chuac': colors.HexColor('#228BE6'),
    'modelo': colors.HexColor('#40C057'),
    'san_rafael': colors.HexColor('#FD7E14'),
}


# ============================================================================
# STYLES
# ============================================================================
def get_custom_styles():
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=COLORS['primary'],
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    # Subtitle
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=COLORS['gray'],
        spaceAfter=30,
        alignment=TA_CENTER,
    ))
    
    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=COLORS['dark'],
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold',
        borderPadding=5,
    ))
    
    # KPI value
    styles.add(ParagraphStyle(
        name='KPIValue',
        parent=styles['Normal'],
        fontSize=24,
        textColor=COLORS['primary'],
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    ))
    
    # KPI label
    styles.add(ParagraphStyle(
        name='KPILabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=COLORS['gray'],
        alignment=TA_CENTER,
    ))
    
    # Chart caption style
    styles.add(ParagraphStyle(
        name='ChartCaption',
        parent=styles['Normal'],
        fontSize=9,
        textColor=COLORS['gray'],
        alignment=TA_CENTER,
        spaceAfter=15,
        spaceBefore=5,
        fontName='Helvetica-Oblique',
    ))
    
    # Subsection header style
    styles.add(ParagraphStyle(
        name='SubsectionHeader',
        parent=styles['Normal'],
        fontSize=12,
        textColor=COLORS['secondary'],
        spaceBefore=10,
        spaceAfter=8,
        fontName='Helvetica-Bold',
    ))
    
    return styles


# ============================================================================
# CHART GENERATORS
# ============================================================================
def create_line_chart_image(
    data: List[Dict],
    title: str,
    width: int = 500,
    height: int = 200
) -> io.BytesIO:
    """Create a line chart as image bytes."""
    fig, ax = plt.subplots(figsize=(width/80, height/80), dpi=80)
    
    # Set dark-ish background for modern look
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_facecolor('#f8f9fa')
    
    # Plot data for each hospital
    for hospital_id, color in [('chuac', '#228BE6'), ('modelo', '#40C057'), ('san_rafael', '#FD7E14')]:
        hospital_data = [d for d in data if d.get('hospital_id') == hospital_id]
        if hospital_data:
            dates = [d['date'] for d in hospital_data]
            values = [d['value'] for d in hospital_data]
            ax.plot(dates, values, color=color, linewidth=2, marker='o', markersize=4, label=hospital_id.upper())
    
    ax.set_title(title, fontsize=12, fontweight='bold', color='#1A1B1E')
    ax.legend(loc='upper right', framealpha=0.9)
    ax.grid(True, alpha=0.3)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


def create_bar_chart_image(
    labels: List[str],
    values: List[float],
    title: str,
    colors_list: List[str] = None,
    width: int = 400,
    height: int = 200
) -> io.BytesIO:
    """Create a bar chart as image bytes."""
    fig, ax = plt.subplots(figsize=(width/80, height/80), dpi=80)
    
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_facecolor('#f8f9fa')
    
    if colors_list is None:
        colors_list = ['#228BE6', '#40C057', '#FD7E14', '#7950F2']
    
    bars = ax.bar(labels, values, color=colors_list[:len(labels)], edgecolor='white', linewidth=1)
    
    # Add value labels on bars
    for bar, val in zip(bars, values):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{val:.0f}',
                ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    ax.set_title(title, fontsize=12, fontweight='bold', color='#1A1B1E')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(True, axis='y', alpha=0.3)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


def create_pie_chart_image(
    labels: List[str],
    values: List[float],
    title: str,
    width: int = 300,
    height: int = 300
) -> io.BytesIO:
    """Create a pie chart as image bytes with correct 1:1 aspect ratio."""
    # Use equal width and height for circular pie chart
    size = min(width, height) / 80
    fig, ax = plt.subplots(figsize=(size, size), dpi=100)
    
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_aspect('equal')  # Ensure circular shape
    
    colors_list = ['#228BE6', '#40C057', '#FD7E14', '#7950F2', '#FA5252']
    
    wedges, texts, autotexts = ax.pie(
        values, 
        labels=labels, 
        colors=colors_list[:len(labels)],
        autopct='%1.1f%%',
        startangle=90,
        pctdistance=0.75
    )
    
    for autotext in autotexts:
        autotext.set_fontsize(9)
        autotext.set_fontweight('bold')
    
    ax.set_title(title, fontsize=12, fontweight='bold', color='#1A1B1E')
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


# ============================================================================
# NEW CHART GENERATORS - Enhanced Visualizations
# ============================================================================

def create_radar_chart_image(
    hospitals: Dict,
    width: int = 400,
    height: int = 400
) -> io.BytesIO:
    """Create a radar chart comparing hospitals across metrics with proper aspect ratio."""
    # Use square dimensions for radar chart
    size = max(width, height) / 80
    fig, ax = plt.subplots(figsize=(size, size), dpi=100, subplot_kw=dict(polar=True))
    fig.patch.set_facecolor('#f8f9fa')
    
    categories = ['Eficiencia', 'Capacidad', 'Tiempo Resp.', 'Satisfacción', 'Flujo']
    N = len(categories)
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]
    
    colors_list = ['#228BE6', '#40C057', '#FD7E14']
    hospital_names = {'chuac': 'CHUAC', 'modelo': 'Modelo', 'san_rafael': 'San Rafael'}
    
    for idx, (hospital_id, data) in enumerate(hospitals.items()):
        sat = _safe_float(data.get('saturacion', 0.6))
        atendidos = _safe_float(data.get('atendidos', 100))
        llegadas = max(1, _safe_float(data.get('llegadas', 100)))
        wait_val = _safe_float(data.get('tiempo_espera', 15))
        
        values = [
            min(100, (1 - sat) * 100 + 30),
            min(100, atendidos / llegadas * 100),
            min(100, max(0, 100 - wait_val * 3)),
            min(100, 70 + (1-sat) * 30),
            min(100, atendidos / 10)
        ]
        values += values[:1]
        
        ax.plot(angles, values, 'o-', linewidth=2, label=hospital_names.get(hospital_id, hospital_id), color=colors_list[idx % 3])
        ax.fill(angles, values, alpha=0.25, color=colors_list[idx % 3])
    
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, size=10)
    ax.legend(loc='upper right', bbox_to_anchor=(1.25, 1.0), fontsize=9)
    plt.title('Comparativa de Hospitales', fontsize=12, fontweight='bold', pad=15)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


def create_heatmap_image(
    hourly_data: List[Dict],
    width: int = 500,
    height: int = 200
) -> io.BytesIO:
    """Create a heatmap showing activity by hour and day."""
    fig, ax = plt.subplots(figsize=(width/80, height/80), dpi=80)
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_facecolor('#f8f9fa')
    
    # Build matrix 7 days x 24 hours
    data_matrix = np.zeros((7, 24))
    for item in hourly_data:
        day = item.get('day', 0)
        hour = item.get('hour', 0)
        activity = item.get('activity', 50)
        if 0 <= day < 7 and 0 <= hour < 24:
            data_matrix[day, hour] = activity
    
    # If no data, generate sample
    if data_matrix.sum() == 0:
        for day in range(7):
            for hour in range(24):
                if 2 <= hour <= 6:
                    base = 20
                elif 9 <= hour <= 12:
                    base = 85
                elif 18 <= hour <= 21:
                    base = 70
                else:
                    base = 45
                data_matrix[day, hour] = base + np.random.randint(-10, 15)
    
    im = ax.imshow(data_matrix, cmap='YlOrRd', aspect='auto', vmin=0, vmax=100)
    
    ax.set_yticks(range(7))
    ax.set_yticklabels(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], fontsize=8)
    ax.set_xticks(range(0, 24, 3))
    ax.set_xticklabels([f'{h}h' for h in range(0, 24, 3)], fontsize=8)
    
    cbar = plt.colorbar(im, ax=ax, shrink=0.8)
    cbar.set_label('Actividad %', fontsize=9)
    
    ax.set_title('Mapa de Calor: Actividad por Hora y Día', fontsize=11, fontweight='bold')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


def create_funnel_chart_image(
    stages: Dict[str, int],
    width: int = 400,
    height: int = 200
) -> io.BytesIO:
    """Create a funnel chart showing patient flow through stages."""
    fig, ax = plt.subplots(figsize=(width/80, height/80), dpi=80)
    fig.patch.set_facecolor('#f8f9fa')
    ax.set_facecolor('#f8f9fa')
    
    stage_names = list(stages.keys())
    values = list(stages.values())
    max_val = max(values) if values else 100
    
    colors_list = ['#228BE6', '#12B886', '#7950F2', '#40C057']
    y_pos = range(len(stage_names))
    
    # Draw horizontal bars (funnel effect)
    for i, (name, val) in enumerate(zip(stage_names, values)):
        width_ratio = val / max_val
        bar_width = width_ratio * 0.9
        left_offset = (1 - width_ratio) / 2
        
        ax.barh(i, bar_width, left=left_offset, height=0.6, 
                color=colors_list[i % len(colors_list)], edgecolor='white', linewidth=2)
        ax.text(0.5, i, f'{name}\n{val}', ha='center', va='center', 
                fontsize=10, fontweight='bold', color='white')
    
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.5, len(stage_names) - 0.5)
    ax.invert_yaxis()
    ax.axis('off')
    ax.set_title('Flujo de Pacientes', fontsize=12, fontweight='bold')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


def create_triage_donut_image(
    distribution: Dict[str, int],
    width: int = 300,
    height: int = 250
) -> io.BytesIO:
    """Create a donut chart showing triage level distribution."""
    fig, ax = plt.subplots(figsize=(width/80, height/80), dpi=80)
    fig.patch.set_facecolor('#f8f9fa')
    
    triage_colors = {
        'rojo': '#FA5252', 'naranja': '#FD7E14', 'amarillo': '#FAB005',
        'verde': '#40C057', 'azul': '#228BE6'
    }
    
    labels = list(distribution.keys())
    values = list(distribution.values())
    colors_list = [triage_colors.get(l, '#868E96') for l in labels]
    
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, colors=colors_list,
        autopct='%1.0f%%', startangle=90, pctdistance=0.75,
        wedgeprops=dict(width=0.5)
    )
    
    for autotext in autotexts:
        autotext.set_fontsize(8)
        autotext.set_fontweight('bold')
    
    ax.set_title('Distribución por Nivel de Triaje', fontsize=11, fontweight='bold')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#f8f9fa')
    plt.close(fig)
    buf.seek(0)
    return buf


# ============================================================================
# PDF GENERATOR
# ============================================================================
class HospitalReportGenerator:
    """Generates professional PDF reports for hospital metrics."""
    
    def __init__(self):
        self.styles = get_custom_styles()
        self.page_width, self.page_height = A4
        self.content_width = self.page_width - 4*cm  # Account for margins
    
    def _create_centered_chart(self, chart_buf: io.BytesIO, width_cm: float, height_cm: float, 
                                caption: str = None) -> List:
        """Create a centered chart with optional caption."""
        elements = []
        
        # Create chart image
        chart_buf.seek(0)
        chart_img = Image(chart_buf, width=width_cm*cm, height=height_cm*cm)
        
        # Center the chart using a table
        chart_table = Table([[chart_img]], colWidths=[self.content_width])
        chart_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(chart_table)
        
        # Add caption if provided
        if caption:
            elements.append(Paragraph(caption, self.styles['ChartCaption']))
        
        return elements
    
    def _create_two_column_charts(self, left_buf: io.BytesIO, right_buf: io.BytesIO,
                                   left_caption: str = None, right_caption: str = None,
                                   left_width: float = 7.5, left_height: float = 6,
                                   right_width: float = 7.5, right_height: float = 6) -> List:
        """Create side-by-side charts in a 2-column layout."""
        elements = []
        
        # Create left chart with caption
        left_buf.seek(0)
        left_img = Image(left_buf, width=left_width*cm, height=left_height*cm)
        left_content = [left_img]
        if left_caption:
            left_content.append(Paragraph(left_caption, self.styles['ChartCaption']))
        
        # Create right chart with caption
        right_buf.seek(0)
        right_img = Image(right_buf, width=right_width*cm, height=right_height*cm)
        right_content = [right_img]
        if right_caption:
            right_content.append(Paragraph(right_caption, self.styles['ChartCaption']))
        
        # Create nested tables for each column
        left_table = Table([[c] for c in left_content], colWidths=[left_width*cm])
        right_table = Table([[c] for c in right_content], colWidths=[right_width*cm])
        
        # Apply styles
        for t in [left_table, right_table]:
            t.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
        
        # Create main 2-column table
        col_width = self.content_width / 2
        main_table = Table([[left_table, right_table]], colWidths=[col_width, col_width])
        main_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        
        elements.append(main_table)
        elements.append(Spacer(1, 10))
        
        return elements
    
    def _create_section_divider(self) -> List:
        """Create a visual section divider line."""
        elements = []
        # Create a subtle horizontal line
        line_table = Table([['']], colWidths=[self.content_width - 2*cm], rowHeights=[1])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 0.5, COLORS['light_gray']),
        ]))
        elements.append(Spacer(1, 15))
        elements.append(line_table)
        elements.append(Spacer(1, 15))
        return elements
    
    def generate_all_charts(self, metrics: Dict) -> Dict[str, io.BytesIO]:
        """
        Generate all charts for the report and return them as bytes buffers.
        This allows the Reviewer Agent to analyze them before the report is assembled.
        """
        charts = {}
        
        # 1. Daily Trend
        try:
            trend_data = metrics.get('daily_trend', [])
            if trend_data and isinstance(trend_data, list):
                 charts['daily_trend'] = create_line_chart_image(
                     trend_data, 
                     "Tendencia Diaria de Pacientes", 
                     width=500, height=200
                 )
        except Exception as e:
            logger.error(f"Error generating Daily Trend chart: {e}")

        # 2. Hospital Comparison Radar
        try:
            hospitals = metrics.get('hospitals', {})
            if hospitals:
                charts['radar_chart'] = create_radar_chart_image(hospitals, width=450, height=450)
        except Exception as e:
            logger.error(f"Error generating Radar chart: {e}")

        # 3. Patient Flow Funnel
        try:
            total = _safe_int(metrics.get('total_patients', 100))
            stages = {
                'Ventanilla': total,
                'Triaje': int(total * 0.95) if total > 0 else 0,
                'Consulta': int(total * 0.90) if total > 0 else 0,
                'Alta/Obs.': int(total * 0.85) if total > 0 else 0,
            }
            charts['funnel_chart'] = create_funnel_chart_image(stages, width=420, height=180)
        except Exception as e:
            logger.error(f"Error generating Funnel chart: {e}")

        # 4. Hourly Heatmap
        try:
            hourly_data = metrics.get('hourly_data', [])
            if hourly_data:
                charts['heatmap_chart'] = create_heatmap_image(hourly_data, width=480, height=180)
        except Exception as e:
             logger.error(f"Error generating Heatmap chart: {e}")

        # 5. Triage Distribution Donut
        try:
            triage_dist = metrics.get('triage_distribution', {})
            if triage_dist:
                 charts['triage_chart'] = create_triage_donut_image(triage_dist, width=300, height=220)
        except Exception as e:
            logger.error(f"Error generating Triage Donut: {e}")
            
        # 6. Wait Times Line Chart
        try:
            wait_times = metrics.get('wait_times_trend', []) # Assuming this exists or using daily trend
            if wait_times:
                charts['wait_times_chart'] = create_line_chart_image(wait_times, "Evolución Tiempos de Espera", width=480, height=200)
        except Exception as e:
            logger.error(f"Error generating Wait Times chart: {e}")

        # 7. Staff Pie Chart
        try:
            staff = metrics.get('staff_status', {})
            if staff:
                 available = _safe_int(staff.get('sergas_available', 18))
                 assigned = _safe_int(staff.get('sergas_assigned', 32))
                 charts['staff_chart'] = create_pie_chart_image(
                    ['Disponibles', 'Asignados'],
                    [available, assigned],
                    "Distribución de Médicos SERGAS",
                    width=240, height=240
                )
        except Exception as e:
            logger.error(f"Error generating Staff chart: {e}")

        return charts

    def generate_report(
        self,
        period_type: str,  # 'weekly' or 'monthly'
        metrics: Dict,
        start_date: datetime,
        end_date: datetime,
        charts: Optional[Dict[str, io.BytesIO]] = None
    ) -> io.BytesIO:
        """
        Generate a complete professional PDF report.
        
        Args:
            period_type: 'weekly' or 'monthly'
            metrics: Dictionary containing all metrics data
            start_date: Report period start
            end_date: Report period end
            
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2.5*cm,
            bottomMargin=2*cm
        )
        
        elements = []
        
        # 1. Cover Page
        elements.extend(self._create_cover_page(period_type, start_date, end_date))
        elements.append(PageBreak())
        
        # 2. Table of Contents
        elements.extend(self._create_table_of_contents())
        elements.append(PageBreak())
        
        # 3. Executive Summary with 8+ KPIs
        elements.extend(self._create_expanded_kpi_section(metrics))
        
        # 4. Daily Trend Chart
        elements.extend(self._create_trend_section(metrics, start_date, end_date))
        
        # 5. Hospital Comparison (Radar Chart) - Use pre-generated chart if available
        radar_buf = charts.get('radar_chart') if charts else None
        elements.extend(self._create_hospital_analysis_section(metrics, radar_buf))
        elements.append(PageBreak())
        
        # 6. Hospital Metrics Table
        elements.extend(self._create_hospital_table(metrics))
        
        # 7. Patient Flow Funnel
        funnel_buf = charts.get('funnel_chart') if charts else None
        elements.extend(self._create_patient_flow_section(metrics, funnel_buf))
        
        # 8. Hourly Activity Heatmap
        heatmap_buf = charts.get('heatmap_chart') if charts else None
        elements.extend(self._create_hourly_analysis_section(metrics, heatmap_buf))
        elements.append(PageBreak())
        
        # 9. Triage + Wait Times (Side-by-side layout)
        triage_buf = charts.get('triage_chart') if charts else None
        wait_buf = charts.get('wait_times_chart') if charts else None
        elements.extend(self._create_combined_triage_waits_section(metrics, triage_buf, wait_buf))
        
        # 11. Staff Section
        staff_buf = charts.get('staff_chart') if charts else None
        elements.extend(self._create_staff_section(metrics, staff_buf))
        elements.append(PageBreak())
        
        # 12. LLM Conclusions & Recommendations
        elements.extend(self._create_conclusions_section(metrics))
        
        # Footer
        elements.extend(self._create_footer())
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def _create_cover_page(self, period_type: str, start_date: datetime, end_date: datetime) -> List:
        """Create professional cover page with medical cross logo."""
        elements = []
        elements.append(Spacer(1, 3*cm))
        
        # Create medical cross logo using ReportLab Drawing
        logo_drawing = Drawing(80, 80)
        
        # Main cross shape (horizontal bar)
        logo_drawing.add(Rect(10, 30, 60, 20, fillColor=COLORS['primary'], strokeColor=None))
        # Vertical bar
        logo_drawing.add(Rect(30, 10, 20, 60, fillColor=COLORS['primary'], strokeColor=None))
        
        elements.append(logo_drawing)
        elements.append(Spacer(1, 1.5*cm))
        
        # Main title with professional font
        title = Paragraph(
            "<font name='Helvetica-Bold' color='#1864AB' size='36'>HEALTHVERSE CORUÑA</font>",
            ParagraphStyle('CoverTitle', alignment=TA_CENTER, spaceAfter=15, leading=42)
        )
        elements.append(title)
        
        # Subtitle with lighter weight
        subtitle = Paragraph(
            "<font name='Helvetica' color='#495057' size='14'>Sistema de Urgencias Hospitalarias</font>",
            ParagraphStyle('CoverSubtitle', alignment=TA_CENTER, spaceAfter=40, leading=18)
        )
        elements.append(subtitle)
        
        elements.append(Spacer(1, 1.5*cm))
        
        # Decorative line
        elements.append(HRFlowable(width="40%", thickness=2, color=COLORS['primary'], spaceBefore=20, spaceAfter=20))
        
        # Report type
        period_label = "INFORME SEMANAL" if period_type == 'weekly' else "INFORME MENSUAL"
        report_type = Paragraph(
            f"<font name='Helvetica-Bold' color='#1A1B1E' size='22'>{period_label}</font>",
            ParagraphStyle('ReportType', alignment=TA_CENTER, spaceAfter=25, leading=28)
        )
        elements.append(report_type)
        
        # Date range
        date_range = Paragraph(
            f"<font name='Helvetica' color='#495057' size='13'>Período: {start_date.strftime('%d de %B de %Y')} - {end_date.strftime('%d de %B de %Y')}</font>",
            ParagraphStyle('DateRange', alignment=TA_CENTER, spaceAfter=15, leading=16)
        )
        elements.append(date_range)
        
        elements.append(Spacer(1, 4*cm))
        
        # Footer with decorative line
        elements.append(HRFlowable(width="60%", thickness=0.5, color=COLORS['gray'], spaceBefore=20, spaceAfter=10))
        
        # Generation info
        gen_info = Paragraph(
            f"<font name='Helvetica' color='#868E96' size='9'>Generado automáticamente el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}</font>",
            ParagraphStyle('GenInfo', alignment=TA_CENTER, leading=12)
        )
        elements.append(gen_info)
        
        # Version
        version = Paragraph(
            "<font name='Helvetica' color='#ADB5BD' size='8'>HealthVerse v2.0 - Gemelo Digital Hospitalario</font>",
            ParagraphStyle('Version', alignment=TA_CENTER, leading=10)
        )
        elements.append(version)
        
        return elements
    
    def _create_table_of_contents(self) -> List:
        """Create automatic table of contents."""
        elements = []
        
        elements.append(Paragraph("ÍNDICE", self.styles['ReportTitle']))
        elements.append(Spacer(1, 1*cm))
        
        sections = [
            ("1. Resumen Ejecutivo", 3),
            ("2. Tendencia Diaria de Pacientes", 3),
            ("3. Análisis Comparativo de Hospitales", 4),
            ("4. Métricas Detalladas por Hospital", 4),
            ("5. Flujo de Pacientes", 4),
            ("6. Análisis Horario de Actividad", 5),
            ("7. Distribución de Triaje", 5),
            ("8. Tiempos de Espera", 5),
            ("9. Asignación de Personal", 6),
            ("10. Conclusiones y Recomendaciones", 7),
        ]
        
        for section, page in sections:
            toc_entry = Paragraph(
                f"<font size='12'>{section}</font><font color='#868E96'> {'.'*50} {page}</font>",
                ParagraphStyle('TOCEntry', spaceAfter=8)
            )
            elements.append(toc_entry)
        
        return elements
    
    def _create_expanded_kpi_section(self, metrics: Dict) -> List:
        """Create executive summary with visually enhanced KPI cards."""
        elements = []
        
        # Enhanced section header with decorative line
        header_table = Table(
            [[Paragraph("━━━━━━━━━━━━", ParagraphStyle('line', textColor=COLORS['primary'])),
              Paragraph("1. RESUMEN EJECUTIVO", self.styles['SectionHeader']),
              Paragraph("━━━━━━━━━━━━", ParagraphStyle('line', textColor=COLORS['primary']))]],
            colWidths=[4*cm, 9*cm, 4*cm]
        )
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 20))
        
        # Calculate KPIs
        total = metrics.get('total_patients', 0)
        treated = metrics.get('patients_treated', 0)
        derived = metrics.get('patients_derived', 0)
        avg_wait = metrics.get('avg_wait_time', 0)
        efficiency = metrics.get('efficiency', 0)
        saturation = metrics.get('avg_saturation', 0) * 100 if metrics.get('avg_saturation', 0) <= 1 else metrics.get('avg_saturation', 0)
        data_source = metrics.get('data_source', 'N/A')
        
        # Format data source nicely
        if data_source == 'influxdb':
            source_display = "Real-time"
            source_color = COLORS['success']
        elif data_source == 'sample':
            source_display = "Simulado"
            source_color = COLORS['warning']
        else:
            source_display = "N/A"
            source_color = COLORS['gray']
        
        # KPI cards with individual colored backgrounds
        kpis_row1 = [
            (f"{total:,}".replace(',','.'), 'Pacientes Totales', COLORS['primary'], colors.HexColor('#E7F5FF')),
            (f"{treated:,}".replace(',','.'), 'Pacientes Atendidos', COLORS['success'], colors.HexColor('#D3F9D8')),
            (str(derived), 'Derivaciones', COLORS['warning'], colors.HexColor('#FFF3E0')),
            (f"{efficiency:.1f}%", 'Eficiencia', COLORS['secondary'], colors.HexColor('#E6FCF5')),
        ]
        
        kpis_row2 = [
            (f"{avg_wait:.0f} min", 'Tiempo Espera', COLORS['accent'], colors.HexColor('#F3F0FF')),
            (f"{saturation:.0f}%", 'Saturación', COLORS['danger'] if saturation > 75 else COLORS['warning'], 
             colors.HexColor('#FFE3E3') if saturation > 75 else colors.HexColor('#FFF3E0')),
            (str(len(metrics.get('incidents', []))), 'Incidentes', COLORS['gray'], colors.HexColor('#F8F9FA')),
            (source_display, 'Fuente Datos', source_color, colors.HexColor('#F8F9FA')),
        ]
        
        for kpis in [kpis_row1, kpis_row2]:
            # Create individual KPI cards
            row_cells = []
            for value, label, text_color, bg_color in kpis:
                # Use smaller font for larger numbers
                font_size = 22 if len(str(value)) > 5 else 26
                
                # Create a mini-table for each KPI card
                card_content = [
                    [Paragraph(f"<font color='{text_color.hexval()}' size='{font_size}'><b>{value}</b></font>",
                               ParagraphStyle('KPIVal', alignment=TA_CENTER, fontName='Helvetica-Bold'))],
                    [Paragraph(f"<font color='#495057' size='9'>{label}</font>",
                               ParagraphStyle('KPILbl', alignment=TA_CENTER, fontName='Helvetica'))],
                ]
                card = Table(card_content, colWidths=[3.8*cm], rowHeights=[1.5*cm, 0.6*cm])
                card.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BACKGROUND', (0, 0), (-1, -1), bg_color),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#DEE2E6')),
                    ('ROUNDEDCORNERS', [4, 4, 4, 4]),  # Rounded corners
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                row_cells.append(card)
            
            # Create main row table
            main_row = Table([row_cells], colWidths=[4.2*cm]*4)
            main_row.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(main_row)
            elements.append(Spacer(1, 12))
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _create_hospital_analysis_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create hospital comparison with radar chart."""
        elements = []
        
        elements.append(Paragraph("3. ANÁLISIS COMPARATIVO DE HOSPITALES", self.styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        hospitals = metrics.get('hospitals', {})
        if hospitals:
            # Use provided buffer or generate new one
            if chart_buf:
                radar_buf = chart_buf
            else:
                radar_buf = create_radar_chart_image(hospitals, width=450, height=450)
            
            radar_img = Image(radar_buf, width=15*cm, height=15*cm) # Adjusted for square aspect
            elements.append(radar_img)
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _create_patient_flow_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create patient flow funnel visualization."""
        elements = []
        
        elements.append(Paragraph("5. FLUJO DE PACIENTES", self.styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        if chart_buf:
            funnel_buf = chart_buf
        else:
            total = metrics.get('total_patients', 100)
            stages = {
                'Ventanilla': total,
                'Triaje': int(total * 0.95),
                'Consulta': int(total * 0.90),
                'Alta/Obs.': int(total * 0.85),
            }
            funnel_buf = create_funnel_chart_image(stages, width=420, height=180)
        
        # Use centered chart helper with caption
        elements.extend(self._create_centered_chart(
            funnel_buf, 14, 6,
            caption="Flujo de pacientes a través de las diferentes etapas del proceso asistencial"
        ))
        
        return elements
    
    def _create_hourly_analysis_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create hourly activity heatmap."""
        elements = []
        
        elements.append(Paragraph("6. ANÁLISIS HORARIO DE ACTIVIDAD", self.styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        if chart_buf:
            heatmap_buf = chart_buf
        else:
            hourly_data = metrics.get('hourly_data', [])
            heatmap_buf = create_heatmap_image(hourly_data, width=480, height=180)
        
        # Use centered chart helper with caption
        elements.extend(self._create_centered_chart(
            heatmap_buf, 16, 6,
            caption="Distribución de actividad: colores más intensos indican mayor volumen de pacientes"
        ))
        
        return elements
    
    def _create_triage_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create triage distribution donut chart."""
        elements = []
        
        elements.append(Paragraph("7. DISTRIBUCIÓN DE TRIAJE", self.styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        triage_chart_buffer = None
        if chart_buf:
            triage_chart_buffer = chart_buf
        else:
            triage_dist = metrics.get('triage_distribution', {
                'rojo': 5, 'naranja': 15, 'amarillo': 35, 'verde': 40, 'azul': 5
            })
            if sum(triage_dist.values()) > 0:
                triage_chart_buffer = create_triage_donut_image(triage_dist, width=300, height=220)
            
        if triage_chart_buffer:
            donut_img = Image(triage_chart_buffer, width=10*cm, height=7*cm)
            elements.append(donut_img)
        
        elements.append(Spacer(1, 15))
        return elements
    
    def _create_combined_triage_waits_section(self, metrics: Dict, 
                                               triage_buf: Optional[io.BytesIO] = None,
                                               wait_buf: Optional[io.BytesIO] = None) -> List:
        """Create combined triage and wait times section with side-by-side charts."""
        elements = []
        
        elements.append(Paragraph("7. MÉTRICAS OPERATIVAS", self.styles['SectionHeader']))
        elements.append(Spacer(1, 10))
        
        # Generate triage chart if not provided
        if triage_buf:
            triage_chart = triage_buf
        else:
            triage_dist = metrics.get('triage_distribution', {
                'rojo': 5, 'naranja': 15, 'amarillo': 35, 'verde': 40, 'azul': 5
            })
            if sum(triage_dist.values()) > 0:
                triage_chart = create_triage_donut_image(triage_dist, width=280, height=200)
            else:
                triage_chart = None
        
        # Generate wait times chart if not provided
        if wait_buf:
            wait_chart = wait_buf
        else:
            wait_times = metrics.get('wait_times', {
                'Ventanilla': 3.2,
                'Triaje': 8.5,
                'Consulta': 22.4,
            })
            wait_chart = create_bar_chart_image(
                list(wait_times.keys()),
                list(wait_times.values()),
                "Tiempo de Espera por Área",
                colors_list=['#228BE6', '#40C057', '#7950F2'],
                width=280,
                height=200
            )
        
        # Create side-by-side layout if both charts exist
        if triage_chart and wait_chart:
            elements.extend(self._create_two_column_charts(
                triage_chart, wait_chart,
                left_caption="Distribución por Nivel de Triaje",
                right_caption="Tiempos de Espera Promedio (min)",
                left_width=7, left_height=5.5,
                right_width=7, right_height=5.5
            ))
        elif triage_chart:
            elements.extend(self._create_centered_chart(triage_chart, 10, 7, 
                                                        "Distribución por Nivel de Triaje"))
        elif wait_chart:
            elements.extend(self._create_centered_chart(wait_chart, 12, 6,
                                                        "Tiempos de Espera Promedio"))
        
        elements.append(Spacer(1, 10))
        return elements
    
    def _create_conclusions_section(self, metrics: Dict) -> List:
        """Create LLM-powered conclusions and recommendations section."""
        elements = []
        
        elements.append(Paragraph("10. CONCLUSIONES Y RECOMENDACIONES", self.styles['SectionHeader']))
        elements.append(Spacer(1, 15))
        
        llm_analysis = metrics.get('llm_analysis', {})
        
        # Executive Summary - handle multi-paragraph text
        summary = llm_analysis.get('executive_summary', 'No hay análisis disponible para este período.')
        elements.append(Paragraph("<b><font size='12'>Resumen Ejecutivo</font></b>", self.styles['Normal']))
        elements.append(Spacer(1, 8))
        
        # Split summary into paragraphs and render each
        paragraphs = summary.split('\n\n') if '\n\n' in summary else [summary]
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.strip(), self.styles['Normal']))
                elements.append(Spacer(1, 8))
        elements.append(Spacer(1, 10))
        
        # Key Findings
        findings = llm_analysis.get('key_findings', [])
        if findings:
            elements.append(Paragraph("<b><font size='12'>Hallazgos Principales</font></b>", self.styles['Normal']))
            elements.append(Spacer(1, 8))
            for i, finding in enumerate(findings, 1):
                elements.append(Paragraph(f"<b>{i}.</b> {finding}", self.styles['Normal']))
                elements.append(Spacer(1, 4))
            elements.append(Spacer(1, 10))
        
        # Recommendations with priority colors
        recommendations = llm_analysis.get('recommendations', [])
        if recommendations:
            elements.append(Paragraph("<b><font size='12'>Recomendaciones</font></b>", self.styles['Normal']))
            elements.append(Spacer(1, 8))
            
            for rec in recommendations:
                if isinstance(rec, dict):
                    priority = rec.get('priority', 3)
                    text = rec.get('text', '')
                    if priority == 1:
                        priority_label = "<font color='#FA5252'><b>[PRIORIDAD ALTA]</b></font>"
                    elif priority == 2:
                        priority_label = "<font color='#FD7E14'><b>[PRIORIDAD MEDIA]</b></font>"
                    else:
                        priority_label = "<font color='#228BE6'><b>[PRIORIDAD BAJA]</b></font>"
                    elements.append(Paragraph(f"{priority_label} {text}", self.styles['Normal']))
                else:
                    elements.append(Paragraph(f"• {rec}", self.styles['Normal']))
                elements.append(Spacer(1, 6))
            elements.append(Spacer(1, 10))
        
        # Alerts with warning styling
        alerts = llm_analysis.get('alerts', [])
        if alerts:
            elements.append(Paragraph("<b><font size='12' color='#FA5252'>Alertas</font></b>", self.styles['Normal']))
            elements.append(Spacer(1, 8))
            for alert in alerts:
                elements.append(Paragraph(f"<font color='#FA5252'>⚠ {alert}</font>", self.styles['Normal']))
                elements.append(Spacer(1, 4))
            elements.append(Spacer(1, 10))
        
        # Outlook section
        outlook = llm_analysis.get('outlook', '')
        if outlook:
            elements.append(Paragraph("<b><font size='12'>Perspectivas para el Próximo Período</font></b>", self.styles['Normal']))
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(outlook, self.styles['Normal']))
            elements.append(Spacer(1, 15))
        
        # AI badge
        if llm_analysis.get('ai_generated', False):
            elements.append(Paragraph(
                "<font color='#868E96' size='9'><i>Análisis generado con Inteligencia Artificial (Llama-3 70B)</i></font>",
                ParagraphStyle('AIBadge', alignment=TA_RIGHT)
            ))
        else:
            elements.append(Paragraph(
                "<font color='#868E96' size='9'><i>Análisis generado automáticamente basado en métricas del período</i></font>",
                ParagraphStyle('AIBadge', alignment=TA_RIGHT)
            ))
        
        return elements
    
    def _create_header(
        self,
        period_type: str,
        start_date: datetime,
        end_date: datetime
    ) -> List:
        """Create report header with title and period."""
        elements = []
        
        # Title with emoji
        title = Paragraph(
            "🏥 HEALTHVERSE CORUÑA",
            self.styles['ReportTitle']
        )
        elements.append(title)
        
        # Subtitle
        period_label = "Semanal" if period_type == 'weekly' else "Mensual"
        subtitle = Paragraph(
            f"Informe de Operaciones Hospitalarias - {period_label}<br/>"
            f"<font size='10'>Período: {start_date.strftime('%d %b %Y')} - {end_date.strftime('%d %b %Y')}</font>",
            self.styles['ReportSubtitle']
        )
        elements.append(subtitle)
        
        # Decorative line
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=COLORS['primary'],
            spaceAfter=20
        ))
        
        return elements
    
    def _create_kpi_section(self, metrics: Dict) -> List:
        """Create executive summary with KPI cards."""
        elements = []
        
        elements.append(Paragraph(
            "📊 RESUMEN EJECUTIVO",
            self.styles['SectionHeader']
        ))
        elements.append(Spacer(1, 10))
        
        # KPI data
        kpis = [
            (str(metrics.get('total_patients', 0)), 'Pacientes\nTotales', COLORS['primary']),
            (str(metrics.get('patients_treated', 0)), 'Pacientes\nAtendidos', COLORS['success']),
            (f"{metrics.get('avg_wait_time', 0):.1f}m", 'Tiempo Espera\nPromedio', COLORS['warning']),
            (f"{metrics.get('efficiency', 0):.1f}%", 'Eficiencia\nGlobal', COLORS['secondary']),
        ]
        
        # Create KPI table
        kpi_data = []
        kpi_labels = []
        
        for value, label, color in kpis:
            kpi_data.append(Paragraph(
                f"<font color='{color.hexval()}'><b>{value}</b></font>",
                self.styles['KPIValue']
            ))
            kpi_labels.append(Paragraph(label.replace('\n', '<br/>'), self.styles['KPILabel']))
        
        kpi_table = Table(
            [kpi_data, kpi_labels],
            colWidths=[4*cm, 4*cm, 4*cm, 4*cm],
            rowHeights=[1.5*cm, 1*cm]
        )
        
        kpi_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['light']),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLORS['light']),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        elements.append(kpi_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_trend_section(
        self,
        metrics: Dict,
        start_date: datetime,
        end_date: datetime
    ) -> List:
        """Create daily trend chart section."""
        elements = []
        
        elements.append(Paragraph(
            "📈 TENDENCIA DIARIA DE PACIENTES",
            self.styles['SectionHeader']
        ))
        elements.append(Spacer(1, 10))
        
        # Generate sample trend data if not provided
        trend_data = metrics.get('daily_trend', [])
        if not trend_data:
            # Generate sample data
            num_days = (end_date - start_date).days + 1
            for hospital in ['chuac', 'modelo', 'san_rafael']:
                base = {'chuac': 80, 'modelo': 30, 'san_rafael': 20}[hospital]
                for i in range(num_days):
                    trend_data.append({
                        'hospital_id': hospital,
                        'date': i,
                        'value': base + np.random.randint(-10, 15)
                    })
        
        # Create chart image
        chart_buf = create_line_chart_image(
            trend_data,
            "Llegadas de Pacientes por Hospital",
            width=480,
            height=180
        )
        
        chart_img = Image(chart_buf, width=16*cm, height=6*cm)
        elements.append(chart_img)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_hospital_table(self, metrics: Dict) -> List:
        """Create hospital metrics comparison table."""
        elements = []
        
        elements.append(Paragraph(
            "🏥 MÉTRICAS POR HOSPITAL",
            self.styles['SectionHeader']
        ))
        elements.append(Spacer(1, 10))
        
        # Table data
        hospital_data = metrics.get('hospitals', {
            'chuac': {'llegadas': 823, 'atendidos': 798, 'derivados': 12, 'saturacion': 0.65},
            'modelo': {'llegadas': 245, 'atendidos': 238, 'derivados': 8, 'saturacion': 0.72},
            'san_rafael': {'llegadas': 166, 'atendidos': 160, 'derivados': 5, 'saturacion': 0.58},
        })
        
        table_data = [
            [
                Paragraph('<b>Hospital</b>', self.styles['Normal']),
                Paragraph('<b>Llegadas</b>', self.styles['Normal']),
                Paragraph('<b>Atendidos</b>', self.styles['Normal']),
                Paragraph('<b>Derivados</b>', self.styles['Normal']),
                Paragraph('<b>Saturación</b>', self.styles['Normal']),
            ]
        ]
        
        hospital_names = {
            'chuac': 'CHUAC',
            'modelo': 'H. Modelo',
            'san_rafael': 'San Rafael'
        }
        
        for hospital_id, data in hospital_data.items():
            sat_pct = data.get('saturacion', 0) * 100
            sat_color = '#40C057' if sat_pct < 60 else '#FD7E14' if sat_pct < 80 else '#FA5252'
            
            table_data.append([
                Paragraph(f"<font color='{HOSPITAL_COLORS.get(hospital_id, COLORS['primary']).hexval()}'><b>{hospital_names.get(hospital_id, hospital_id)}</b></font>", self.styles['Normal']),
                str(data.get('llegadas', 0)),
                str(data.get('atendidos', 0)),
                str(data.get('derivados', 0)),
                Paragraph(f"<font color='{sat_color}'><b>{sat_pct:.1f}%</b></font>", self.styles['Normal']),
            ])
        
        table = Table(
            table_data,
            colWidths=[4*cm, 3*cm, 3*cm, 3*cm, 3*cm],
            rowHeights=[0.8*cm] * len(table_data)
        )
        
        table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLORS['light']]),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['gray']),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, COLORS['light']),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_wait_times_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create wait times bar chart section."""
        elements = []
        
        elements.append(Paragraph(
            "⏱️ TIEMPOS DE ESPERA PROMEDIO",
            self.styles['SectionHeader']
        ))
        elements.append(Spacer(1, 10))
        
        if chart_buf:
            bar_buf = chart_buf
        else:
            # Wait times data
            wait_times = metrics.get('wait_times', {
                'Ventanilla': 3.2,
                'Triaje': 8.5,
                'Consulta': 22.4,
            })
            
            bar_buf = create_bar_chart_image(
                list(wait_times.keys()),
                list(wait_times.values()),
                "Tiempo de Espera por Área (minutos)",
                colors_list=['#228BE6', '#40C057', '#7950F2'],
                width=400,
                height=180
            )
        
        chart_img = Image(bar_buf, width=14*cm, height=6*cm)
        elements.append(chart_img)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_staff_section(self, metrics: Dict, chart_buf: Optional[io.BytesIO] = None) -> List:
        """Create staff assignment section."""
        elements = []
        
        elements.append(Paragraph(
            "👨‍⚕️ ASIGNACIÓN DE PERSONAL",
            self.styles['SectionHeader']
        ))
        elements.append(Spacer(1, 10))
        
        pie_buf = None
        if chart_buf:
             pie_buf = chart_buf
        else:
             staff = metrics.get('staff', { # Original was 'staff', diff suggests 'staff_status'
                'sergas_total': 50,
                'sergas_available': 18,
                'sergas_assigned': 32,
            })
             available = staff.get('sergas_available', 18)
             assigned = staff.get('sergas_assigned', 32)
             pie_buf = create_pie_chart_image(
                ['Disponibles', 'Asignados'],
                [available, assigned],
                "Distribución de Médicos SERGAS",
                width=280, # Original was 280, diff suggests 240
                height=220 # Original was 220, diff suggests 240
            )
            
        chart_img = Image(pie_buf, width=10*cm, height=7*cm) # Original was 10*cm, 7*cm, diff suggests 8*cm, 8*cm
        
        # Staff summary text
        staff = metrics.get('staff', { # Original was 'staff', diff suggests 'staff_status'
            'sergas_total': 50,
            'sergas_available': 18,
            'sergas_assigned': 32,
        })
        summary = Paragraph(
            f"""
            <b>Resumen de Personal SERGAS:</b><br/><br/>
            • Total registrado: <b>{staff.get('sergas_total', 50)}</b> médicos<br/>
            • Disponibles: <font color='#40C057'><b>{staff.get('sergas_available', 18)}</b></font><br/>
            • Asignados: <font color='#228BE6'><b>{staff.get('sergas_assigned', 32)}</b></font><br/><br/>
            <i>Los médicos asignados están distribuidos en consultas de los tres hospitales.</i>
            """,
            self.styles['Normal']
        )
        
        # Layout side by side
        layout_table = Table(
            [[chart_img, summary]],
            colWidths=[10*cm, 6*cm]
        )
        layout_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(layout_table)
        elements.append(Spacer(1, 20))
        
        return elements
    
    def _create_footer(self) -> List:
        """Create report footer."""
        elements = []
        
        elements.append(HRFlowable(
            width="100%",
            thickness=1,
            color=COLORS['gray'],
            spaceBefore=20,
            spaceAfter=10
        ))
        
        footer = Paragraph(
            f"<font size='8' color='#868E96'>"
            f"Generado automáticamente por HealthVerse Coruña • "
            f"Gemelo Digital Hospitalario v2.0 • "
            f"{datetime.now().strftime('%d/%m/%Y %H:%M')}"
            f"</font>",
            self.styles['Normal']
        )
        footer.alignment = TA_CENTER
        elements.append(footer)
        
        return elements


# ============================================================================
# PAINTER AGENT
# ============================================================================
class PainterAgent(HospitalReportGenerator):
    """
    Agent responsible for visualizing data and rendering the final report.
    Inherits from HospitalReportGenerator for access to layout and style methods.
    """
    
    def generate_visuals(self, metrics: Dict) -> Dict[str, io.BytesIO]:
        """Phase 1: Generate all charts for the Reviewer Agent."""
        return self.generate_all_charts(metrics)
    
    def assemble_final_report(
        self, 
        content: Dict, 
        metrics: Dict, 
        charts: Dict[str, io.BytesIO],
        period_type: str,
        start_date: datetime,
        end_date: datetime
    ) -> io.BytesIO:
        """Phase 2: Assemble PDF with finalized content and pre-generated charts."""
        # Inject refined content into metrics for the generator to use
        metrics['llm_analysis'] = content
        
        # Call parent generate_report, passing the pre-generated charts
        return self.generate_report(period_type, metrics, start_date, end_date, charts=charts)


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================
def generate_weekly_report(metrics: Dict = None) -> io.BytesIO:
    """Generate a weekly report PDF."""
    generator = HospitalReportGenerator()
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    if metrics is None:
        metrics = _generate_sample_metrics()
    
    return generator.generate_report('weekly', metrics, start_date, end_date)


def generate_monthly_report(metrics: Dict = None) -> io.BytesIO:
    """Generate a monthly report PDF."""
    generator = HospitalReportGenerator()
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    if metrics is None:
        metrics = _generate_sample_metrics()
    
    return generator.generate_report('monthly', metrics, start_date, end_date)


def generate_custom_report(
    start_date: datetime,
    end_date: datetime,
    metrics: Dict = None
) -> io.BytesIO:
    """Generate a custom period report PDF."""
    generator = HospitalReportGenerator()
    period_type = 'weekly' if (end_date - start_date).days <= 7 else 'monthly'
    
    if metrics is None:
        metrics = _generate_sample_metrics()
    
    return generator.generate_report(period_type, metrics, start_date, end_date)


def _generate_sample_metrics() -> Dict:
    """Generate sample metrics for demo purposes."""
    return {
        'total_patients': 1234,
        'patients_treated': 1189,
        'avg_wait_time': 15.3,
        'efficiency': 96.4,
        'hospitals': {
            'chuac': {'llegadas': 823, 'atendidos': 798, 'derivados': 12, 'saturacion': 0.65},
            'modelo': {'llegadas': 245, 'atendidos': 238, 'derivados': 8, 'saturacion': 0.72},
            'san_rafael': {'llegadas': 166, 'atendidos': 153, 'derivados': 5, 'saturacion': 0.58},
        },
        'wait_times': {
            'Ventanilla': 3.2,
            'Triaje': 8.5,
            'Consulta': 22.4,
        },
        'staff': {
            'sergas_total': 50,
            'sergas_available': 18,
            'sergas_assigned': 32,
        }
    }
