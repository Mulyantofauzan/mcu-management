/**
 * Performance Monitor - Track load times and identify bottlenecks
 *
 * Helps identify:
 * - Slow page loads
 * - Network request delays
 * - Rendering performance issues
 * - Cache hit rates
 */

class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
    this.enabled = true;

    // Log performance on page load
    if (window.performance && window.performance.timing) {
      this.logInitialMetrics();
    }
  }

  /**
   * Start measuring a metric
   */
  mark(name) {
    if (!this.enabled) return;

    try {
      if (window.performance?.mark) {
        window.performance.mark(`${name}-start`);
      } else {
        this.marks.set(`${name}-start`, performance.now());
      }
    } catch (error) {
      console.warn('Mark error:', error);
    }
  }

  /**
   * End measuring and log result
   */
  measure(name, threshold = null) {
    if (!this.enabled) return;

    try {
      let duration = 0;

      if (window.performance?.measure) {
        try {
          window.performance.measure(name, `${name}-start`);
          const measure = window.performance.getEntriesByName(name)[0];
          duration = measure?.duration || 0;
        } catch (error) {
          // Mark doesn't exist or measure failed
          const start = this.marks.get(`${name}-start`);
          if (start) {
            duration = performance.now() - start;
          }
        }
      } else {
        const start = this.marks.get(`${name}-start`);
        if (start) {
          duration = performance.now() - start;
        }
      }

      if (duration > 0) {
        this.measures.set(name, duration);

        // Log if exceeds threshold
        if (threshold && duration > threshold) {
          console.warn(`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
        } else if (duration > 1000) {
          console.warn(`⚠️ Performance: ${name} took ${duration.toFixed(2)}ms (slow)`);
        }
      }

      return duration;
    } catch (error) {
      console.warn('Measure error:', error);
      return 0;
    }
  }

  /**
   * Log initial page metrics
   */
  logInitialMetrics() {
    try {
      const timing = window.performance.timing;
      const paint = window.performance.getEntriesByType('paint');

      const metrics = {
        'DNS Lookup': timing.domainLookupEnd - timing.domainLookupStart,
        'TCP Connection': timing.connectEnd - timing.connectStart,
        'Time to First Byte': timing.responseStart - timing.requestStart,
        'Download Time': timing.responseEnd - timing.responseStart,
        'DOM Processing': timing.domInteractive - timing.domLoading,
        'Resource Loading': timing.loadEventStart - timing.domContentLoadedEventEnd,
        'Total Load Time': timing.loadEventEnd - timing.navigationStart
      };

      // Log FCP and LCP if available
      if (paint.length > 0) {
        console.log(`📊 First Contentful Paint: ${paint[0].startTime.toFixed(2)}ms`);
      }

      console.log('📊 Page Load Metrics:', metrics);
    } catch (error) {
      console.warn('Could not access performance metrics:', error);
    }
  }

  /**
   * Get all measurements
   */
  getMetrics() {
    return Object.fromEntries(this.measures);
  }

  /**
   * Log all metrics
   */
  logMetrics() {
    console.table(this.getMetrics());
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
