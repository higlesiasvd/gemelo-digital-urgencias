"""
============================================================================
PANDOC PDF REPORT GENERATOR - Hospital Digital Twin
============================================================================
Generates professional PDF reports using Pandoc + Eisvogel template
with colored boxes, professional typography, and modern design.
============================================================================
"""

import io
import os
import base64
import tempfile
import subprocess
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

logger = logging.getLogger(__name__)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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
# CHART GENERATORS (produce base64 encoded images)
# ============================================================================

def create_trend_chart_base64(data: List[Dict], width: int = 10, height: int = 4) -> str:
    """Create a professional line chart and return as base64 string."""
    fig, ax = plt.subplots(figsize=(width, height))
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FAFAFA')
    
    if data and len(data) > 0:
        # Group by hospital_id if present
        hospitals = {}
        for d in data:
            h_id = d.get('hospital_id', 'total')
            if h_id not in hospitals:
                hospitals[h_id] = []
            hospitals[h_id].append(d)
        
        colors = {'chuac': '#228BE6', 'modelo': '#40C057', 'san_rafael': '#FD7E14', 'total': '#7950F2'}
        labels = {'chuac': 'CHUAC', 'modelo': 'Modelo', 'san_rafael': 'San Rafael', 'total': 'Total'}
        
        for h_id, h_data in hospitals.items():
            dates = [d.get('date', d.get('day', i)) for i, d in enumerate(h_data)]
            values = [d.get('count', d.get('value', 0)) for d in h_data]
            color = colors.get(h_id, '#228BE6')
            label = labels.get(h_id, h_id.upper())
            ax.plot(dates, values, color=color, linewidth=2.5, marker='o', markersize=5, label=label)
            ax.fill_between(dates, values, alpha=0.1, color=color)
        
        ax.legend(loc='upper right', framealpha=0.95, fontsize=10)
    else:
        ax.text(0.5, 0.5, 'Sin datos disponibles', ha='center', va='center', fontsize=14, color='#868E96')
    
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.set_xlabel('Día', fontsize=11, color='#495057')
    ax.set_ylabel('Pacientes', fontsize=11, color='#495057')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def create_bar_chart_base64(labels: List[str], values: List[float], colors: List[str] = None,
                            width: int = 8, height: int = 4, title: str = None) -> str:
    """Create a professional bar chart and return as base64 string."""
    fig, ax = plt.subplots(figsize=(width, height))
    fig.patch.set_facecolor('#FFFFFF')
    ax.set_facecolor('#FAFAFA')
    
    if colors is None:
        colors = ['#228BE6', '#40C057', '#7950F2', '#FD7E14', '#FA5252']
    
    # Ensure values are meaningful (prevent empty charts)
    values = [max(0.1, v) if v > 0 else 0.1 for v in values]
    
    bars = ax.bar(labels, values, color=colors[:len(labels)], edgecolor='white', linewidth=2)
    
    # Set appropriate y-axis limits
    max_val = max(values) if values else 1
    ax.set_ylim(0, max_val * 1.25)  # Add 25% headroom for labels
    
    # Add value labels on bars
    for bar, val in zip(bars, values):
        bar_height = bar.get_height()
        label_y = bar_height + (max_val * 0.03)  # Position label slightly above bar
        ax.text(bar.get_x() + bar.get_width()/2., label_y,
                f'{val:.1f}' if isinstance(val, float) else str(val),
                ha='center', va='bottom', fontsize=11, fontweight='bold', color='#495057')
    
    if title:
        ax.set_title(title, fontsize=13, fontweight='bold', color='#1A1B1E', pad=15)
    
    ax.set_ylabel('Minutos', fontsize=11, color='#495057')
    ax.grid(True, axis='y', alpha=0.3, linestyle='--')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def create_donut_chart_base64(labels: List[str], values: List[float], colors: List[str] = None,
                              width: int = 6, height: int = 6, title: str = None) -> str:
    """Create a professional donut chart and return as base64 string."""
    fig, ax = plt.subplots(figsize=(width, height))
    fig.patch.set_facecolor('#FFFFFF')
    
    # Filter out zero values
    filtered = [(l, v) for l, v in zip(labels, values) if v > 0]
    if not filtered:
        ax.text(0.5, 0.5, 'Sin datos', ha='center', va='center', fontsize=14, color='#868E96')
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, facecolor='white')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    
    labels, values = zip(*filtered)
    
    if colors is None:
        colors = ['#FA5252', '#FD7E14', '#FAB005', '#40C057', '#228BE6']
    
    wedges, texts, autotexts = ax.pie(values, labels=labels, colors=colors[:len(labels)],
                                       autopct='%1.1f%%', startangle=90,
                                       wedgeprops=dict(width=0.6, edgecolor='white', linewidth=2),
                                       pctdistance=0.75)
    
    for autotext in autotexts:
        autotext.set_fontsize(10)
        autotext.set_fontweight('bold')
        autotext.set_color('#495057')
    
    for text in texts:
        text.set_fontsize(10)
        text.set_color('#495057')
    
    if title:
        ax.set_title(title, fontsize=13, fontweight='bold', color='#1A1B1E', pad=15)
    
    ax.set_aspect('equal')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def create_radar_chart_base64(hospitals: Dict, width: int = 8, height: int = 8) -> str:
    """Create a professional radar chart comparing hospitals."""
    fig, ax = plt.subplots(figsize=(width, height), subplot_kw=dict(projection='polar'))
    fig.patch.set_facecolor('#FFFFFF')
    
    categories = ['Eficiencia', 'Tiempo Respuesta', 'Satisfacción', 'Capacidad', 'Flujo']
    N = len(categories)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    angles += angles[:1]
    
    colors = {'chuac': '#228BE6', 'modelo': '#40C057', 'san_rafael': '#FD7E14'}
    labels = {'chuac': 'CHUAC', 'modelo': 'HM Modelo', 'san_rafael': 'San Rafael'}
    
    for name, data in hospitals.items():
        if isinstance(data, dict):
            sat = _safe_float(data.get('saturacion', 0.6))
            atendidos = _safe_float(data.get('atendidos', 100))
            llegadas = max(1, _safe_float(data.get('llegadas', 100)))
            wait_val = _safe_float(data.get('tiempo_espera', 15))
            
            values = [
                min(100, (1 - sat) * 100 + 30),  # Eficiencia
                min(100, max(0, 100 - wait_val * 3)),  # Tiempo respuesta
                min(100, 70 + (1-sat) * 30),  # Satisfacción
                min(100, atendidos / llegadas * 100),  # Capacidad
                min(100, atendidos / 10)  # Flujo
            ]
            values += values[:1]
            
            color = colors.get(name, '#228BE6')
            label = labels.get(name, name.upper())
            ax.plot(angles, values, 'o-', linewidth=2.5, label=label, color=color, markersize=6)
            ax.fill(angles, values, alpha=0.2, color=color)
    
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=11, color='#495057')
    ax.set_ylim(0, 100)
    ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.05), fontsize=10, framealpha=0.95)
    ax.grid(True, alpha=0.4)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def create_heatmap_base64(hourly_data: List[Dict], width: int = 12, height: int = 5) -> str:
    """Create a professional heatmap showing activity by hour and day."""
    fig, ax = plt.subplots(figsize=(width, height))
    fig.patch.set_facecolor('#FFFFFF')
    
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
    ax.set_yticklabels(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], 
                       fontsize=10, color='#495057')
    ax.set_xticks(range(0, 24, 2))
    ax.set_xticklabels([f'{h}:00' for h in range(0, 24, 2)], fontsize=9, color='#495057', rotation=45)
    
    cbar = plt.colorbar(im, ax=ax, shrink=0.8)
    cbar.set_label('Nivel de Actividad (%)', fontsize=10, color='#495057')
    
    ax.set_title('Mapa de Actividad Semanal', fontsize=13, fontweight='bold', color='#1A1B1E', pad=15)
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


# ============================================================================
# MARKDOWN GENERATOR WITH EISVOGEL STYLING
# ============================================================================

class PandocReportGenerator:
    """Generates professional PDF reports using Pandoc + Eisvogel template."""
    
    HOSPITAL_NAMES = {
        'chuac': 'CHUAC - Complejo Hospitalario',
        'modelo': 'Hospital HM Modelo',
        'san_rafael': 'Hospital San Rafael'
    }
    
    def __init__(self):
        self.template_path = os.path.join(os.path.dirname(__file__), 'templates', 'eisvogel.latex')
    
    def _get_status_icon(self, value: float, thresholds: tuple, inverse: bool = False) -> str:
        """Return status indicator based on thresholds (ASCII for LaTeX compatibility)."""
        low, high = thresholds
        if inverse:
            if value <= low:
                return "[OK] Optimo"
            elif value <= high:
                return "[--] Normal"
            else:
                return "[!!] Alto"
        else:
            if value >= high:
                return "[OK] Optimo"
            elif value >= low:
                return "[--] Normal"
            else:
                return "[!!] Bajo"
    
    def generate_markdown(self, metrics: Dict, period_type: str, 
                          start_date: datetime, end_date: datetime,
                          llm_analysis: Optional[Dict] = None) -> str:
        """Generate Markdown content with YAML frontmatter for Eisvogel."""
        
        # Extract metrics with safe defaults
        total = _safe_int(metrics.get('total_patients', 0))
        treated = _safe_int(metrics.get('patients_treated', 0))
        derived = _safe_int(metrics.get('patients_derived', 0))
        efficiency = _safe_float(metrics.get('efficiency', 0))
        avg_wait = _safe_float(metrics.get('avg_wait_time', 0))
        saturation = _safe_float(metrics.get('avg_saturation', 0))
        if saturation <= 1:
            saturation *= 100
        
        period_days = (end_date - start_date).days
        period_label = "Semanal" if period_type in ['weekly', 'semanal'] else "Mensual"
        
        # Path to cover image
        cover_image_path = os.path.join(os.path.dirname(__file__), 'templates', 'cover_image.png')
        
        # Eisvogel Frontmatter
        # Eisvogel Frontmatter
        # Use simple string for the dynamic part, but careful with braces
        frontmatter_vars = f"""---
title: "Informe de Urgencias Hospitalarias"
subtitle: "{period_label} - Sistema HealthVerse Coruña"
author: "Gemelo Digital Hospitalario"
date: "{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
documentclass: article
papersize: a4
geometry: margin=2.5cm
fontsize: 11pt
colorlinks: true
toc: true
toc-depth: 2
toc-own-page: true
titlepage: true
titlepage-background: "{cover_image_path}"
titlepage-rule-color: "FFFFFF"
titlepage-rule-height: 0
titlepage-no-text: true
logo: "false"
"""

        # Append static part with LaTeX commands (braces are safe here)
        frontmatter = frontmatter_vars + r"""header-includes:
  - \usepackage{pagecolor}
  - \renewcommand{\contentsname}{Índice}
---

"""

        # =====================================================================
        # CONTENT STARTS
        # =====================================================================
        content = """
# Resumen Ejecutivo

"""

        
        # Add LLM executive summary if available
        if llm_analysis and llm_analysis.get('executive_summary'):
            content += f"{llm_analysis['executive_summary']}\n\n"
        else:
            # Generate basic summary
            content += f"""Durante el período analizado ({period_days} días), el Sistema de Urgencias Hospitalarias 
de A Coruña ha procesado un total de **{total:,}** pacientes. De estos, **{treated:,}** fueron 
atendidos satisfactoriamente y **{derived}** requirieron derivación a otros centros.

La eficiencia operativa global alcanzó el **{efficiency:.1f}%**, con una saturación media del 
**{saturation:.0f}%** y tiempos de espera promedio de **{avg_wait:.0f} minutos**.

"""
        
        # =====================================================================
        # KPI SECTION
        # =====================================================================
        content += """
## Indicadores Clave de Rendimiento (KPIs)

| Indicador | Valor | Estado |
|:----------|------:|:-------|
"""
        content += f"| **Pacientes Totales** | {total:,} | {self._get_status_icon(total, (300, 500), True)} |\n"
        content += f"| **Pacientes Atendidos** | {treated:,} | {self._get_status_icon(treated/max(1,total)*100, (90, 95))} |\n"
        content += f"| **Derivaciones** | {derived} | {self._get_status_icon(derived, (10, 20), True)} |\n"
        content += f"| **Eficiencia Global** | {efficiency:.1f}% | {self._get_status_icon(efficiency, (85, 95))} |\n"
        content += f"| **Tiempo Espera Promedio** | {avg_wait:.0f} min | {self._get_status_icon(avg_wait, (15, 25), True)} |\n"
        content += f"| **Saturación Media** | {saturation:.0f}% | {self._get_status_icon(saturation, (60, 80), True)} |\n"
        content += "\n"
        
        # =====================================================================
        # TREND CHART
        # =====================================================================
        trend_data = metrics.get('daily_trend', [])
        if trend_data:
            try:
                trend_b64 = create_trend_chart_base64(trend_data)
                content += f"""
# Evolución Temporal

La siguiente gráfica muestra la tendencia de pacientes durante el período analizado, 
desglosada por hospital:

![Tendencia Diaria de Pacientes](data:image/png;base64,{trend_b64})

"""
            except Exception as e:
                logger.warning(f"Error generating trend chart: {e}")
        
        # =====================================================================
        # HOSPITAL COMPARISON
        # =====================================================================
        hospitals = metrics.get('hospitals', {})
        if hospitals:
            content += """
# Análisis por Hospital

## Comparativa de Rendimiento

| Hospital | Llegadas | Atendidos | Saturación | Espera Media |
|:---------|--------:|----------:|-----------:|-------------:|
"""
            for h_id, data in hospitals.items():
                if isinstance(data, dict):
                    h_name = self.HOSPITAL_NAMES.get(h_id, h_id.upper())
                    llegadas = _safe_int(data.get('llegadas', 0))
                    atendidos = _safe_int(data.get('atendidos', 0))
                    sat = _safe_float(data.get('saturacion', 0))
                    if sat <= 1:
                        sat *= 100
                    wait = _safe_float(data.get('tiempo_espera', 0))
                    content += f"| **{h_name}** | {llegadas:,} | {atendidos:,} | {sat:.0f}% | {wait:.0f} min |\n"
            
            content += "\n"
            
            # Radar chart
            try:
                radar_b64 = create_radar_chart_base64(hospitals)
                content += f"""
## Comparativa Radar

El siguiente gráfico radar compara el rendimiento de los tres hospitales en cinco 
dimensiones clave:

![Comparativa de Hospitales](data:image/png;base64,{radar_b64})

"""
            except Exception as e:
                logger.warning(f"Error generating radar chart: {e}")
        
        # =====================================================================
        # TRIAGE DISTRIBUTION
        # =====================================================================
        triage_dist = metrics.get('triage_distribution', {})
        if triage_dist and sum(triage_dist.values()) > 0:
            triage_labels = list(triage_dist.keys())
            triage_values = list(triage_dist.values())
            triage_colors = ['#FA5252', '#FD7E14', '#FAB005', '#40C057', '#228BE6']
            
            content += """
# Distribución por Triaje

La clasificación de pacientes por nivel de urgencia durante el período:

| Nivel | Pacientes | Porcentaje |
|:------|----------:|-----------:|
"""
            total_triage = sum(triage_values)
            for label, value in zip(triage_labels, triage_values):
                pct = (value / total_triage * 100) if total_triage > 0 else 0
                content += f"| **{label.title()}** | {value:,} | {pct:.1f}% |\n"
            
            try:
                triage_b64 = create_donut_chart_base64(
                    [l.title() for l in triage_labels], 
                    triage_values, 
                    triage_colors
                )
                content += f"""
![Distribución por Nivel de Triaje](data:image/png;base64,{triage_b64})

"""
            except Exception as e:
                logger.warning(f"Error generating triage chart: {e}")
        
        # =====================================================================
        # WAIT TIMES
        # =====================================================================
        wait_times = metrics.get('wait_times', {})
        if wait_times:
            content += """
# Tiempos de Espera por Área

Análisis de los tiempos de espera promedio en cada etapa del proceso asistencial:

| Área | Tiempo (min) | Estado |
|:-----|-------------:|:-------|
"""
            for area, tiempo in wait_times.items():
                tiempo = _safe_float(tiempo)
                status = self._get_status_icon(tiempo, (10, 20), True)
                content += f"| **{area}** | {tiempo:.1f} | {status} |\n"
            
            try:
                wait_b64 = create_bar_chart_base64(
                    list(wait_times.keys()), 
                    [_safe_float(v) for v in wait_times.values()],
                    ['#228BE6', '#40C057', '#7950F2']
                )
                content += f"""
![Tiempos de Espera por Área](data:image/png;base64,{wait_b64})

"""
            except Exception as e:
                logger.warning(f"Error generating wait times chart: {e}")
        
        # =====================================================================
        # HOURLY HEATMAP
        # =====================================================================
        hourly_data = metrics.get('hourly_data', [])
        if hourly_data:
            try:
                heatmap_b64 = create_heatmap_base64(hourly_data)
                content += f"""
# Patrones de Actividad

El siguiente mapa de calor muestra los patrones de actividad a lo largo de la semana, 
identificando las horas y días de mayor demanda:

![Mapa de Actividad Semanal](data:image/png;base64,{heatmap_b64})

"""
            except Exception as e:
                logger.warning(f"Error generating heatmap: {e}")
        
        # =====================================================================
        # STAFF SECTION
        # =====================================================================
        staff = metrics.get('staff', {})
        if staff:
            total_staff = _safe_int(staff.get('sergas_total', 50))
            available = _safe_int(staff.get('sergas_available', 18))
            assigned = _safe_int(staff.get('sergas_assigned', 32))
            
            content += f"""
# Recursos Humanos

## Estado del Personal SERGAS

| Categoría | Cantidad | Porcentaje |
|:----------|--------:|-----------:|
| **Total Médicos** | {total_staff} | 100% |
| **Asignados** | {assigned} | {assigned/max(1,total_staff)*100:.0f}% |
| **Disponibles** | {available} | {available/max(1,total_staff)*100:.0f}% |

"""
        
        # =====================================================================
        # CONCLUSIONS AND RECOMMENDATIONS (FROM LLM)
        # =====================================================================
        if llm_analysis:
            content += """
# Conclusiones y Recomendaciones

"""
            # Key findings
            findings = llm_analysis.get('key_findings', [])
            if findings:
                content += "## Hallazgos Principales\n\n"
                for i, finding in enumerate(findings[:5], 1):
                    content += f"{i}. {finding}\n"
                content += "\n"
            
            # Recommendations
            recommendations = llm_analysis.get('recommendations', [])
            if recommendations:
                content += "## Recomendaciones\n\n"
                for rec in recommendations[:5]:
                    if isinstance(rec, dict):
                        priority = rec.get('priority', 3)
                        text = rec.get('text', '')
                        priority_label = "[Alta]" if priority == 1 else "[Media]" if priority == 2 else "[Normal]"
                        content += f"- **[{priority_label}]** {text}\n"
                    else:
                        content += f"- {rec}\n"
                content += "\n"
            
            # Alerts
            alerts = llm_analysis.get('alerts', [])
            if alerts:
                content += "## Alertas\n\n"
                for alert in alerts:
                    content += f"> ALERTA: {alert}\n\n"
            
            # Outlook
            outlook = llm_analysis.get('outlook', '')
            if outlook:
                content += f"""## Perspectiva

{outlook}

"""
        
        # =====================================================================
        # FOOTER
        # =====================================================================
        content += f"""
---

*Informe generado automáticamente por el Sistema de Gemelo Digital Hospitalario HealthVerse*

*Fecha de generación: {datetime.now().strftime('%d/%m/%Y a las %H:%M')}*

*Fuente de datos: {metrics.get('data_source', 'InfluxDB').upper()}*
"""
        
        return frontmatter + content
    
    def generate_pdf(self, metrics: Dict, period_type: str,
                     start_date: datetime, end_date: datetime,
                     llm_analysis: Optional[Dict] = None) -> io.BytesIO:
        """Generate PDF using Pandoc with Eisvogel template."""
        
        # Generate markdown content
        markdown_content = self.generate_markdown(
            metrics, period_type, start_date, end_date, llm_analysis
        )
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as md_file:
            md_file.write(markdown_content)
            md_path = md_file.name
        
        pdf_path = md_path.replace('.md', '.pdf')
        
        try:
            # Path to template
            template_path = os.path.join(os.path.dirname(__file__), 'templates', 'eisvogel.latex')
            
            # Build Pandoc command
            cmd = [
                'pandoc',
                md_path,
                '-o', pdf_path,
                '--pdf-engine=pdflatex',
                '--template', template_path,
                '--standalone',
                '--listings',
            ]
            
            # Run Pandoc
            logger.info(f"Running Pandoc with {len(cmd)} arguments")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                logger.error(f"Pandoc error: {result.stderr}")
                # Try even simpler command without cover
                cmd_simple = [
                    'pandoc',
                    md_path,
                    '-o', pdf_path,
                    '--pdf-engine=pdflatex',
                    '-V', 'geometry:margin=2.5cm',
                    '--standalone',
                ]
                logger.info("Retrying with minimal Pandoc command")
                result = subprocess.run(cmd_simple, capture_output=True, text=True, timeout=120)
                
                if result.returncode != 0:
                    raise Exception(f"Pandoc failed: {result.stderr}")
            
            logger.info("PDF generated successfully")
            
            # Read PDF into buffer
            with open(pdf_path, 'rb') as pdf_file:
                buffer = io.BytesIO(pdf_file.read())
            
            buffer.seek(0)
            return buffer
            
        finally:
            # Cleanup temp files
            try:
                os.unlink(md_path)
                if os.path.exists(pdf_path):
                    os.unlink(pdf_path)
            except:
                pass



# Singleton instance
pandoc_generator = PandocReportGenerator()
