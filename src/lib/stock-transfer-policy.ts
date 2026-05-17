const DEFAULT_APPROVAL_QTY_THRESHOLD = 500
const DEFAULT_APPROVAL_VALUE_THRESHOLD = 200000

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function shouldRequireTransferApproval(input: {
  quantity: number
  unitCost: number | null | undefined
  isSensitive?: boolean
}): boolean {
  const qtyThreshold = parseNumberEnv(
    process.env.STOCK_TRANSFER_APPROVAL_QTY_THRESHOLD,
    DEFAULT_APPROVAL_QTY_THRESHOLD
  )
  const valueThreshold = parseNumberEnv(
    process.env.STOCK_TRANSFER_APPROVAL_VALUE_THRESHOLD,
    DEFAULT_APPROVAL_VALUE_THRESHOLD
  )

  if (input.isSensitive) {
    return true
  }

  if (input.quantity >= qtyThreshold) {
    return true
  }

  const transferValue = Math.abs(input.quantity) * Math.max(0, input.unitCost ?? 0)
  return transferValue >= valueThreshold
}
