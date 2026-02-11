"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { CatalogueService, type PackageData, type ParameterDef } from "@/services/catalogue-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Tag, Check, X } from "lucide-react"

export default function CatalogueOverviewPage() {
  const { userData, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PackageData[]>([])
  const [parameterDefs, setParameterDefs] = useState<ParameterDef[]>([])
  const [currency, setCurrency] = useState("$") 

  useEffect(() => {
    const initData = async () => {
      if (!userData?.studioID) return
      
      try {
        const studioID = userData.studioID
        
        const [fetchedCurrency, fetchedParams, fetchedPackages] = await Promise.all([
          CatalogueService.getStudioCurrency(studioID),
          CatalogueService.getParameters(studioID),
          CatalogueService.getPackages(studioID)
        ])

        setCurrency(fetchedCurrency)
        setParameterDefs(fetchedParams)
        setPackages(fetchedPackages)

      } catch (e) {
        console.error("Error initializing catalogue", e)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) initData()
  }, [userData, authLoading])

  const getFinalPrice = (pkg: PackageData) => {
    if (!pkg.discounted) return pkg.price
    if (pkg.discountType === 'fixed') return pkg.price - pkg.discountValue
    return pkg.price - (pkg.price * (pkg.discountValue / 100))
  }

  const formatMoney = (amount: number) => {
    return `${currency} ${amount.toLocaleString()}`
  }

  // [!code highlight] Helper function to determine sort weight
  const getParamWeight = (key: string, value: any) => {
    const def = parameterDefs.find(p => p.name === key)
    
    // Priority 1: Numbers with explicit units
    if (typeof value === 'number' && def?.unit && def.unit.trim().length > 0) return 1
    
    // Priority 2: Plain Numbers (no unit or empty unit)
    if (typeof value === 'number') return 2
    
    // Priority 3: Booleans
    if (typeof value === 'boolean') return 3
    
    // Priority 4: Strings and others
    return 4
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Catalogue</h1>
            <p className="text-slate-500">View currently available service packages.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {packages.map((pkg) => {
            // [!code highlight] Sort parameters before mapping
            const sortedParams = Object.entries(pkg.parameters).sort(([keyA, valA], [keyB, valB]) => {
                const weightA = getParamWeight(keyA, valA)
                const weightB = getParamWeight(keyB, valB)
                
                // If weights are different, sort by weight
                if (weightA !== weightB) return weightA - weightB
                
                // If weights are same, sort alphabetically by name
                return keyA.localeCompare(keyB)
            })

            return (
            <Card key={pkg.id} className={`hover:shadow-lg transition-all border-slate-200 flex flex-col ${pkg.disabled ? 'opacity-60 grayscale' : ''}`}>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg text-[#0F2854] flex items-center gap-2">
                                {pkg.name}
                                {pkg.disabled && <Badge variant="destructive" className="text-[10px] h-5">Unavailable</Badge>}
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#1C4D8D]">
                                  {formatMoney(getFinalPrice(pkg))}
                                </span>
                                {pkg.discounted && (
                                    <span className="text-sm text-slate-400 line-through">
                                      {formatMoney(pkg.price)}
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <div className="p-2 bg-slate-100 rounded-full text-[#1C4D8D]">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>
                    {pkg.discounted && (
                        <Badge className="w-fit mt-2 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <Tag className="w-3 h-3 mr-1" />
                            {pkg.discountType === 'percentage' ? `${pkg.discountValue}% OFF` : `${currency}${pkg.discountValue} OFF`}
                        </Badge>
                    )}
                </CardHeader>
                
                <CardContent className="space-y-3 flex-1">
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 border">
                        {/* [!code highlight] Map over sortedParams instead of Object.entries */}
                        {sortedParams.map(([key, value]) => {
                            const def = parameterDefs.find(p => p.name === key)
                            return (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="text-slate-500">{key}</span>
                                    <span className="font-medium text-slate-900">
                                        {typeof value === 'boolean' ? (
                                            value ? <Check className="h-4 w-4 text-green-600"/> : <X className="h-4 w-4 text-slate-300"/>
                                        ) : (
                                            <>{value} <span className="text-xs text-slate-400 font-normal">{def?.unit}</span></>
                                        )}
                                    </span>
                                </div>
                            )
                        })}
                        {sortedParams.length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center">No specific parameters.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            )
        })}
        
        {packages.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Packages Found</h3>
                <p className="text-slate-500">Contact admin to configure catalogue packages.</p>
            </div>
        )}
      </div>
    </div>
  )
}