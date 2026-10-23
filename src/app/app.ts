import { Component } from '@angular/core';
import { DashboardContainerComponent } from './components/smart/dashboard-container/dashboard-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'emitta-frontend-angular';
}
