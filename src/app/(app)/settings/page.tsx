"use server";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChorizoTypesSettings } from '@/components/settings/chorizo-types-settings';
import { NCFSettings } from '@/components/settings/ncf-settings';
import { UsersSettings } from '@/components/settings/users-settings';
import { UnitTypesSettings } from '@/components/settings/unit-types-settings';
import { getChorizoTypes, getNCFSequences, getUsers, getUnitTypes } from '@/lib/actions/settingsActions';

export default async function SettingsPage() {
    const chorizoTypes = await getChorizoTypes();
    const unitTypes = await getUnitTypes();
    const ncfSequences = await getNCFSequences();
    const users = await getUsers();

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground mt-1">Administre las preferencias generales del sistema.</p>
            </div>

            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="inventory">Inventario</TabsTrigger>
                    <TabsTrigger value="fiscal">Fiscal (NCF)</TabsTrigger>
                    <TabsTrigger value="users">Usuarios</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-4">
                    <ChorizoTypesSettings initialTypes={chorizoTypes} />
                    <UnitTypesSettings initialTypes={unitTypes} />
                </TabsContent>

                <TabsContent value="fiscal" className="space-y-4">
                    <NCFSettings initialSequences={ncfSequences} />
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <UsersSettings initialUsers={users} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
