import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { invoicesCollection } from '@/firebase'
import { Invoice } from '@/types'
import { toast } from 'sonner'

function UpdateInvoiceStatus() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [status, setStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    if (!id) return

    try {
      const invoiceDoc = await getDoc(doc(invoicesCollection, id))
      if (invoiceDoc.exists()) {
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice
        setInvoice(invoiceData)
        setStatus(invoiceData.paidStatus)
      } else {
        toast.error('Invoice not found')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Failed to fetch invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
  }

  const handleUpdate = async () => {
    if (!id || !status) return

    try {
      setIsUpdating(true)
      await updateDoc(doc(invoicesCollection, id), {
        paidStatus: status,
        updatedAt: new Date().toISOString()
      })
      toast.success('Invoice status updated successfully')
      navigate('/invoices')
    } catch (error) {
      console.error('Error updating invoice status:', error)
      toast.error('Failed to update invoice status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Update Invoice Status">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Invoice ID
                  </h3>
                  <p>{invoice.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Current Status
                  </h3>
                  <p className="capitalize">{invoice.paidStatus}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    New Status
                  </h3>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating || status === invoice.paidStatus}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default UpdateInvoiceStatus 