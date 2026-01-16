"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Package, AlertTriangle, Filter, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { getProducts } from '@/lib/actions/inventoryActions';
import { Product, ProductType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateProductDialog } from '@/components/inventory/create-product-dialog';
import { EditProductDialog } from '@/components/inventory/edit-product-dialog';
import { deleteProductAction } from '@/lib/actions/inventoryActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<ProductType | 'Todos' | 'Producto Terminado'>('Todos');
    const { toast } = useToast();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async () => {
        if (!deleteProduct) return;

        const result = await deleteProductAction(deleteProduct.id);
        if (result.success) {
            toast({ title: "Producto eliminado", description: "El producto ha sido eliminado correctamente." });
            fetchProducts();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setDeleteProduct(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsEditOpen(true);
    };

    const filteredProducts = products.filter(product =>
        (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (typeFilter === 'Todos' ||
            (typeFilter === 'Producto Terminado' && product.type === 'Chorizo') ||
            product.type === typeFilter)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Inventario</h1>
                    <p className="text-muted-foreground mt-1">Gestione sus productos y materias primas.</p>
                </div>
                <CreateProductDialog onProductCreated={fetchProducts} />
            </div>

            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ProductType | 'Todos' | 'Producto Terminado')}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Tipo de Producto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                <SelectItem value="Producto Terminado">Producto Terminado</SelectItem>
                                <SelectItem value="Materia Prima">Materia Prima</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Fecha Creación</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product) => (
                                        <TableRow key={product.id} className="hover:bg-muted/30">
                                            <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {product.type === 'Chorizo' ? 'Producto Terminado' : product.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{product.category}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {product.createdAt ? format(new Date(product.createdAt), 'dd MMM yyyy', { locale: es }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {product.stock} {product.unit}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {product.price > 0 ? `$${product.price.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {product.stock <= product.minStock ? (
                                                    <Badge variant="destructive" className="flex items-center justify-end w-fit ml-auto gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Bajo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                                                        Normal
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteProduct(product)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <Package className="h-10 w-10 mb-2 opacity-20" />
                                                <p>No se encontraron productos.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <EditProductDialog
                product={editingProduct}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={fetchProducts}
            />

            <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Está seguro que desea eliminar el producto <strong>{deleteProduct?.name}</strong>?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
