'use client'
import { useParams } from 'next/navigation'
import ReportForm from '@/components/ReportForm'
export default function EditReport() { const { id } = useParams<{ id: string }>(); return <ReportForm reportId={id} /> }
