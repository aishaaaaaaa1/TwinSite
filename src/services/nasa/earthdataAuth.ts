let earthdataToken: string | null = null

export function setEarthdataToken(token: string): void {
  earthdataToken = token.trim() || null
}

export function getEarthdataToken(): string | null {
  return earthdataToken
}
