import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarVerticalComponent, Color, LineChartComponent, PieChartComponent, ScaleType } from '@swimlane/ngx-charts';
import { LegendPosition } from '@swimlane/ngx-charts';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-finance-reports',
  standalone: false,
  templateUrl: './finance-reports.html',
  styleUrl: './finance-reports.css'
})
export class FinanceReports {
  // Chart data
  claimsByStatusData: any[] = [];
  ordersByStatusData: any[] = [];
  spendingByCategoryData: any[] = [];
  monthlySpendingData: any[] = [];

  loading = false;
  dateRange = 'month';
  startDate: string;
  endDate: string;
  private destroy$ = new Subject<void>();

  // Chart options with responsive settings
chartOptions = {
  animations: true,
  showLegend: true,
  showLabels: true,
  isDoughnut: false,
  view: [700, 400] as [number, number],
  colorScheme: <Color>{
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      '#5AA454',
      '#A10A28',
      '#C7B42C',
      '#AAAAAA',
      '#3366CC',
      '#FF9900',
      '#109618',
      '#990099'
    ]
  }
};

  // Chart references
  @ViewChildren(PieChartComponent) pieCharts!: QueryList<PieChartComponent>;
  @ViewChildren(BarVerticalComponent) barCharts!: QueryList<BarVerticalComponent>;
  @ViewChildren(LineChartComponent) lineCharts!: QueryList<LineChartComponent>;
  @ViewChild('reportsContainer', { static: false }) reportsContainer!: ElementRef;

  constructor(private apiService: Api) {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadReports();
  }

  ngAfterViewInit() {
    // Update charts when they become available
    this.pieCharts.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateCharts();
    });
    
    this.barCharts.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateCharts();
    });
    
    this.lineCharts.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateCharts();
    });

    // Initial update after a short delay
    setTimeout(() => this.updateCharts(), 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateCharts() {
    // Update chart dimensions based on container
    this.updateChartDimensions();
    
    // Force chart updates
    this.pieCharts.forEach(chart => {
      if (chart && typeof chart.update === 'function') {
        setTimeout(() => chart.update(), 0);
      }
    });
    
    this.barCharts.forEach(chart => {
      if (chart && typeof chart.update === 'function') {
        setTimeout(() => chart.update(), 0);
      }
    });
    
    this.lineCharts.forEach(chart => {
      if (chart && typeof chart.update === 'function') {
        setTimeout(() => chart.update(), 0);
      }
    });
  }

  updateChartDimensions() {
    if (this.reportsContainer && this.reportsContainer.nativeElement) {
      const containerWidth = this.reportsContainer.nativeElement.offsetWidth;
      if (containerWidth > 0) {
        const chartWidth = Math.max(containerWidth - 40, 300);
        this.chartOptions.view = [chartWidth, 400];
      }
    }
  }

  onDateRangeChange() {
    const today = new Date();
    let startDate: Date;

    switch (this.dateRange) {
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    this.startDate = startDate.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
   
    this.loadReports();
  }

  onCustomDateChange() {
    if (this.dateRange === 'custom') {
      this.loadReports();
    }
  }

 // In your finance-reports.ts component
loadReports() {
  this.loading = true;
 
  const params = {
    startDate: this.startDate,
    endDate: this.endDate
  };

  console.log('Loading reports with params:', params);

  this.apiService.get<any>('/finance/reports/analytics', params).subscribe({
    next: (response) => {
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        this.processChartData(response.data);
      } else {
        console.warn('Using sample data due to API response issue');
        this.useSampleData();
      }
      this.loading = false;
      
      // Update charts after data is loaded
      setTimeout(() => this.updateCharts(), 200);
    },
    error: (error) => {
      console.error('Error loading reports:', error);
      console.warn('Using sample data due to API error');
      this.useSampleData();
      this.loading = false;
      setTimeout(() => this.updateCharts(), 200);
    }
  });
}
  processChartData(data: any) {
    // Process claims data
    this.claimsByStatusData = [];
    if (data.claims && data.claims.byStatus) {
      for (const [status, count] of Object.entries(data.claims.byStatus)) {
        this.claimsByStatusData.push({
          name: this.formatStatus(status),
          value: count
        });
      }
    }

    // Process orders data
    this.ordersByStatusData = [];
    if (data.orders && data.orders.byStatus) {
      for (const [status, count] of Object.entries(data.orders.byStatus)) {
        this.ordersByStatusData.push({
          name: this.formatStatus(status),
          value: count
        });
      }
    }

    // Process spending by category
    this.spendingByCategoryData = [];
    if (data.spendingByCategory && Array.isArray(data.spendingByCategory)) {
      data.spendingByCategory.forEach((item: any) => {
        this.spendingByCategoryData.push({
          name: item.category || item.name,
          value: item.total || item.value
        });
      });
    }

    // Process monthly spending
    this.monthlySpendingData = [];
    if (data.monthlySpending && Array.isArray(data.monthlySpending)) {
      const claimsSeries: any[] = [];
      const ordersSeries: any[] = [];
      
      data.monthlySpending.forEach((item: any) => {
        claimsSeries.push({
          name: item.month,
          value: item.claimsTotal || 0
        });
        
        ordersSeries.push({
          name: item.month,
          value: item.ordersTotal || 0
        });
      });
      
      this.monthlySpendingData = [
        {
          name: 'Claims',
          series: claimsSeries
        },
        {
          name: 'Orders',
          series: ordersSeries
        }
      ];
    }
  }

  useSampleData() {
    this.claimsByStatusData = [
      { name: 'Submitted', value: 15 },
      { name: 'Approved', value: 10 },
      { name: 'Rejected', value: 4 },
      { name: 'Paid', value: 8 }
    ];
    
    this.ordersByStatusData = [
      { name: 'Submitted', value: 12 },
      { name: 'Approved', value: 8 },
      { name: 'Rejected', value: 3 },
      { name: 'Processing', value: 5 },
      { name: 'Fulfilled', value: 7 }
    ];
    
    this.spendingByCategoryData = [
      { name: 'Travel', value: 2500 },
      { name: 'Food', value: 1200 },
      { name: 'Equipment', value: 3500 },
      { name: 'Stationery', value: 800 }
    ];
    
    this.monthlySpendingData = [
      {
        name: 'Claims',
        series: [
          { name: 'Jan', value: 1200 },
          { name: 'Feb', value: 1800 },
          { name: 'Mar', value: 1500 }
        ]
      },
      {
        name: 'Orders',
        series: [
          { name: 'Jan', value: 800 },
          { name: 'Feb', value: 600 },
          { name: 'Mar', value: 1200 }
        ]
      }
    ];
  }

  formatStatus(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  exportToExcel() {
    const params = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    this.apiService.downloadFile('/finance/reports/export', params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-reports-${this.startDate}_to_${this.endDate}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting reports:', error);
        alert('Failed to export. Please try again.');
      }
    });
  }

  exportToPDF() {
    const printContent = document.getElementById('reports-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Finance Reports - ${this.startDate} to ${this.endDate}</title>
              <style>
                body { font-family: Arial, sans-serif; }
                .chart-container { margin: 20px 0; }
                img { max-width: 100%; }
              </style>
            </head>
            <body>
              <h1>Finance Reports</h1>
              <p>Date Range: ${this.startDate} to ${this.endDate}</p>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }

  // Fallback method to manually refresh charts
  refreshCharts() {
    this.updateCharts();
  }
}