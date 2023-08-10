export interface Csproj {
    Project?: Project
}

export interface Project {
    PropertyGroup: Array<PropertyGroup>
    ItemGroup: Array<ItemGroup>
    Import?: Array<Import>
}

export interface PropertyGroup {
    RootNamespace?: Array<string>
    TargetFramework?: Array<string>
    ImplicitUsings?: Array<string>
}

export interface ItemGroup {
    Using?: Array<Using>
}

export interface Using {
    $?: UsingAttribute
}

export interface Import {
    $: ImportAttribute
}

export interface UsingAttribute {
    Include?: string
    Remove?: string
}

export interface ImportAttribute {
    Project: string
}
