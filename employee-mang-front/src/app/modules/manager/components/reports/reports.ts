import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { BarVerticalComponent, Color, LineChartComponent, PieChartComponent, ScaleType } from '@swimlane/ngx-charts';
import { Chart, registerables } from 'chart.js';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reports',
  standalone: false,
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {
 loading = false;
  dateRange: string = 'month';
  startDate: string;
  endDate: string;
  
  // Reference to chart components
  @ViewChildren(PieChartComponent) pieCharts!: QueryList<PieChartComponent>;
  @ViewChildren(BarVerticalComponent) barCharts!: QueryList<BarVerticalComponent>;
  @ViewChildren(LineChartComponent) lineCharts!: QueryList<LineChartComponent>;
  @ViewChildren('chartContainer') chartContainers!: QueryList<ElementRef>;

  // Chart data
  claimsByStatus: any[] = [];
  ordersByStatus: any[] = [];
  spendingByCategory: any[] = [];
  monthlySpending: any[] = [];

  colorScheme: Color = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#3366CC', '#FF9900', '#109618', '#990099'],
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'CustomScheme'
  };

  view: [number, number] = [700, 400];

  constructor(private api: Api) {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.loadReports();
  }

  ngAfterViewInit() {
    // Subscribe to changes in chart components
    this.pieCharts.changes.subscribe(() => this.updateCharts());
    this.barCharts.changes.subscribe(() => this.updateCharts());
    this.lineCharts.changes.subscribe(() => this.updateCharts());
    
    // Initial update after a brief delay to ensure DOM is ready
    setTimeout(() => this.updateCharts(), 100);
  }

  updateCharts() {
    // Update chart dimensions based on container size
    this.updateChartDimensions();
    
    // Force update on all charts
    this.pieCharts.forEach(chart => {
      if (chart && chart.update) {
        chart.update();
      }
    });
    
    this.barCharts.forEach(chart => {
      if (chart && chart.update) {
        chart.update();
      }
    });
    
    this.lineCharts.forEach(chart => {
      if (chart && chart.update) {
        chart.update();
      }
    });
  }

  updateChartDimensions() {
    if (this.chartContainers && this.chartContainers.length > 0) {
      // Get the width of the first chart container to set consistent dimensions
      const containerWidth = this.chartContainers.first.nativeElement.offsetWidth;
      const newWidth = Math.max(containerWidth - 40, 300); // Ensure minimum width
      this.view = [newWidth, 400];
    }
  }

 // In your reports.ts component - FIX the onDateRangeChange method
onDateRangeChange(): void {
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
    case 'custom':
      return; // handled by custom inputs
    default:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  this.startDate = startDate.toISOString().split('T')[0];
  this.endDate = today.toISOString().split('T')[0];

  this.loadReports();
}
  onCustomDateChange(): void {
    if (this.dateRange === 'custom' && this.startDate && this.endDate) {
      this.loadReports();
    }
  }

  loadReports(): void {
    this.loading = true;
    const params = { startDate: this.startDate, endDate: this.endDate };

    this.api.get<any>('/manager/reports/analytics', params).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.processChartData(res.data);
        } else {
          this.useSampleData();
        }
        this.loading = false;
        
        // Update charts after data is loaded
        setTimeout(() => this.updateCharts(), 100);
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.useSampleData();
        this.loading = false;
        
        // Update charts after data is loaded
        setTimeout(() => this.updateCharts(), 100);
      }
    });
  }

  processChartData(data: any) {
    // Process claims data
    this.claimsByStatus = [];
    if (data.claims && data.claims.byStatus) {
      for (const [status, count] of Object.entries(data.claims.byStatus)) {
        this.claimsByStatus.push({
          name: this.formatStatus(status),
          value: count
        });
      }
    }

    // Process orders data
    this.ordersByStatus = [];
    if (data.orders && data.orders.byStatus) {
      for (const [status, count] of Object.entries(data.orders.byStatus)) {
        this.ordersByStatus.push({
          name: this.formatStatus(status),
          value: count
        });
      }
    }

    // Process spending by category
    this.spendingByCategory = [];
    if (data.spendingByCategory && Array.isArray(data.spendingByCategory)) {
      data.spendingByCategory.forEach((item: any) => {
        this.spendingByCategory.push({
          name: item.category || item.name,
          value: item.total || item.value
        });
      });
    }

    // Process monthly spending - FIXED STRUCTURE
    this.monthlySpending = [];
    if (data.monthlySpending && Array.isArray(data.monthlySpending)) {
      // Create series data in correct format for line chart
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
      
      this.monthlySpending = [
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

  useSampleData(): void {
    // Sample data for demonstration
    this.claimsByStatus = [
      { name: 'Submitted', value: 15 },
      { name: 'Approved', value: 10 },
      { name: 'Rejected', value: 4 },
      { name: 'Paid', value: 8 }
    ];
    
    this.ordersByStatus = [
      { name: 'Submitted', value: 12 },
      { name: 'Approved', value: 8 },
      { name: 'Rejected', value: 3 },
      { name: 'Processing', value: 5 },
      { name: 'Fulfilled', value: 7 }
    ];
    
    this.spendingByCategory = [
      { name: 'Travel', value: 2500 },
      { name: 'Food', value: 1200 },
      { name: 'Equipment', value: 3500 },
      { name: 'Stationery', value: 800 }
    ];
    
    // Correct structure for line chart
    this.monthlySpending = [
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
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Method to check if charts are properly initialized
  areChartsInitialized(): boolean {
    return this.pieCharts.length > 0 && 
           this.barCharts.length > 0 && 
           this.lineCharts.length > 0;
  }

  // Method to manually refresh all charts
  refreshCharts() {
    this.updateCharts();
  }

  exportToExcel(): void {
    const params = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    this.api.downloadFile('/manager/reports/export', params).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manager-reports-${this.startDate}_to_${this.endDate}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting reports:', error);
        alert('Failed to export. Please try again.');
      }
    });
  }

  exportToPDF(): void {
    const doc = new jsPDF();
    doc.text('Manager Reports', 14, 16);
    doc.text(`Date Range: ${this.startDate} to ${this.endDate}`, 14, 24);

    // Add claims by status table
    autoTable(doc, {
      startY: 30,
      head: [['Claims by Status', 'Count']],
      body: this.claimsByStatus.map(item => [item.name, item.value]),
    });

    // Add orders by status table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Orders by Status', 'Count']],
      body: this.ordersByStatus.map(item => [item.name, item.value]),
    });

    doc.save('manager-reports.pdf');
  }
}