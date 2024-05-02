import { Component, OnInit } from '@angular/core';
import { PhotoService } from "src/app/services/photo.service";

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
})
export class Tab1Page implements OnInit {

  constructor(private photoService: PhotoService) {}

  async toggleFlash() {
    await this.photoService.toggleFlashlight();
  }

  ngOnInit() {
  }

}
