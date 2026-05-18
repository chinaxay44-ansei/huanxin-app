import { Spinner } from "@/components/ui/spinner"

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
      <Spinner className="size-12" />
    </div>
  )
}
