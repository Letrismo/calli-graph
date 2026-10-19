import { gsap } from 'gsap';

export class Preloader {
  constructor(element, { items = '[data-intro-item]' } = {}) {
    this.element = element;
    this.items = gsap.utils.toArray(items);
  }

  async start() {
    if (!this.element || !document.documentElement.hasAttribute('data-loading')) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finish();
      return;
    }

    const caption = this.element.querySelector('figcaption');
    this.blink = caption && gsap.to(caption, {
      opacity: 0.35,
      duration: 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Wait for the first screen, never for the lazy map or every page resource.
    const images = document.querySelectorAll('#preloader img, body > header img, #inicio img');
    let timeout;
    await Promise.race([
      Promise.allSettled([
        document.fonts.ready,
        ...Array.from(images, (image) => image.decode()),
      ]),
      new Promise((resolve) => { timeout = window.setTimeout(resolve, 2500); }),
    ]);
    window.clearTimeout(timeout);
    this.blink?.kill();
    if (caption) gsap.set(caption, { clearProps: 'opacity' });

    this.timeline = gsap.timeline({ delay: 2, onComplete: () => this.finish() })
      .to(this.element.querySelector('figure'), {
        yPercent: -110,
        duration: 0.5,
        ease: 'power3.in',
      })
      .to(this.element, {
        yPercent: -100,
        duration: 0.8,
        ease: 'power3.inOut',
      }, '-=0.15')
      .fromTo(this.items, { y: 30, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.75,
        stagger: 0.12,
        ease: 'power3.out',
      }, '-=0.3');
  }

  finish() {
    this.blink?.kill();
    gsap.set(this.items, { clearProps: 'transform,opacity,visibility' });
    document.documentElement.removeAttribute('data-loading');
    this.element?.remove();
  }
}
