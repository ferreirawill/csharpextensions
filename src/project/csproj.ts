export interface Csproj {
    Project: Project | undefined
}

export interface Project {
    PropertyGroup: Array<PropertyGroup>
    ItemGroup: Array<ItemGroup>
}

export interface PropertyGroup {
    RootNamespace: Array<string> | undefined
    TargetFramework: Array<string> | undefined
    ImplicitUsings?: Array<string>
}

export interface ItemGroup {
    Using?: Array<Using>
}

export interface Using {
    $?: UsingAttribute
}

export interface UsingAttribute {
    Include?: string
    Remove?: string
}
