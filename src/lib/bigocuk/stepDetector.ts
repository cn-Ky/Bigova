/**
 * Telefonun ivmeölçerinden (devicemotion) adım sayan, DOM'a bağımlı olmayan sınıf.
 *
 * Yöntem:
 *  1. İvme vektörünün büyüklüğü alınır → telefon nasıl tutulursa tutulsun çalışır.
 *  2. Yavaş hareket eden "yerçekimi" tahmini çıkarılır, kalan değer yumuşatılır.
 *  3. Yerel zirveler adım adayıdır (eşik, yürüyüşün şiddetine göre kendini ayarlar).
 *  4. Tek tük sallanmalar sayılmasın diye ilk 4 aday düzenli bir tempoda gelirse
 *     "yürüyüş başladı" kabul edilir ve o 4 adım geriye dönük eklenir.
 */
export class StepDetector {
  private gravity: number | null = null;
  private smooth = 0;
  private prev1 = 0; // bir önceki yumuşatılmış örnek
  private prev2 = 0; // iki önceki yumuşatılmış örnek
  private prevT = 0; // bir önceki örneğin zamanı
  private amp = 2; // zirve genliği tahmini (m/s²)
  private lastCandidate: number | null = null;
  private lastInterval = 0;
  private streak = 0;
  private walking = false;

  static readonly MIN_PEAK = 0.7; // altındaki zirveler titreme sayılır
  static readonly MIN_GAP_MS = 280; // en fazla ~3.5 adım/sn
  static readonly MAX_GAP_MS = 1200; // bundan uzun ara = yürüyüş koptu
  static readonly LOCK_IN = 4; // yürüyüşü başlatmak için gereken düzenli adım

  get isWalking() {
    return this.walking;
  }

  reset() {
    this.gravity = null;
    this.smooth = this.prev1 = this.prev2 = this.prevT = 0;
    this.amp = 2;
    this.lastCandidate = null;
    this.lastInterval = 0;
    this.streak = 0;
    this.walking = false;
  }

  /** Bir ivme örneği ver (m/s², zaman ms). Sayılacak yeni adım sayısını döndürür. */
  push(x: number, y: number, z: number, t: number): number {
    const m = Math.hypot(x, y, z);
    if (!Number.isFinite(m)) return 0;

    this.gravity = this.gravity === null ? m : this.gravity + 0.02 * (m - this.gravity);
    this.smooth += 0.35 * (m - this.gravity - this.smooth);

    if (this.walking && this.lastCandidate !== null && t - this.lastCandidate > 1500) {
      this.walking = false;
      this.streak = 0;
    }

    // prev1, yerel zirve mi? (soldan büyük, sağdan büyük-eşit, eşiğin üstünde)
    const threshold = Math.max(StepDetector.MIN_PEAK, 0.55 * this.amp);
    const isPeak =
      this.prev1 > this.prev2 && this.prev1 >= this.smooth && this.prev1 > threshold;
    const peakValue = this.prev1;
    const peakT = this.prevT;

    this.prev2 = this.prev1;
    this.prev1 = this.smooth;
    this.prevT = t;

    return isPeak ? this.onCandidate(peakT, peakValue) : 0;
  }

  private onCandidate(t: number, value: number): number {
    if (this.lastCandidate !== null) {
      const dt = t - this.lastCandidate;
      if (dt < StepDetector.MIN_GAP_MS) return 0; // çok yakın: aynı adımın ikinci tepesi
      if (dt > StepDetector.MAX_GAP_MS) {
        this.streak = 1;
        this.walking = false;
        this.lastInterval = 0;
      } else {
        const irregular =
          this.lastInterval > 0 && (dt > this.lastInterval * 1.8 || dt < this.lastInterval / 1.8);
        this.streak = irregular && !this.walking ? 1 : this.streak + 1;
        this.lastInterval = dt;
      }
    } else {
      this.streak = 1;
    }
    this.lastCandidate = t;
    this.amp += 0.2 * (value - this.amp);

    if (this.walking) return 1;
    if (this.streak >= StepDetector.LOCK_IN) {
      this.walking = true;
      return StepDetector.LOCK_IN;
    }
    return 0;
  }
}
