import { Component } from '@angular/core';
import { PctWheelC } from '@pacit/components/wheel-c';
import { PctWheelK } from '@pacit/components/wheel-k';
import { PctWheelW } from '@pacit/components/wheel-w';

/**
 * PROBE for 0091 — the ring's runway, three ways, for a fling in three engines and a walk of
 * three readers. Throwaway: this view lives on a probe branch and is never merged.
 */
@Component({
  selector: 'sbx-runway-view',
  imports: [PctWheelC, PctWheelK, PctWheelW],
  templateUrl: './runway-view.html',
  styleUrl: './runway-view.scss',
})
export class RunwayView {}
