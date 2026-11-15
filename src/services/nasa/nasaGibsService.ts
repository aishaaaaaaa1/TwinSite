export interface NasaGibsImageryLayer {
  url: string
  attribution: string
  contentType: 'visualization'
  numericElevation: false
}

export function describeGibsImagery(
  url: string,
  attribution: string,
): NasaGibsImageryLayer {
  return {
    url,
    attribution,
    contentType: 'visualization',
    numericElevation: false,
  }
}
