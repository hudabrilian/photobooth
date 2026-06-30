let openCvPromise: Promise<any> | null = null;

export function loadOpenCV(): Promise<any> {
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise((resolve, reject) => {
    if ((window as any).cv && (window as any).cv.Mat) {
      resolve((window as any).cv);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.5.4/opencv.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkCV = () => {
        if ((window as any).cv && (window as any).cv.Mat) {
          resolve((window as any).cv);
        } else {
          setTimeout(checkCV, 50);
        }
      };
      checkCV();
    };
    script.onerror = (err) => {
      openCvPromise = null;
      reject(err);
    };
    document.body.appendChild(script);
  });

  return openCvPromise;
}
