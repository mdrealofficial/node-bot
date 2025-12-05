import { useState, useEffect } from "react";
import { LandingPageSidebar } from "./LandingPageSidebar";
import { LandingPageCanvas } from "./LandingPageCanvas";
import { LandingPageElementEditor } from "./LandingPageElementEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Eye, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PageElement {
  id: string;
  type: string;
  properties: any;
  position: number;
  parentId?: string | null;
  children?: PageElement[];
}

interface LandingPageBuilderProps {
  pageId?: string;
  onBack: () => void;
}

export const LandingPageBuilder = ({ pageId, onBack }: LandingPageBuilderProps) => {
  const [elements, setElements] = useState<PageElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<PageElement | null>(null);
  const [pageName, setPageName] = useState("Untitled Page");
  const [slug, setSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPageId, setCurrentPageId] = useState(pageId);
  const { toast } = useToast();

  useEffect(() => {
    if (pageId) {
      loadPage(pageId);
    }
  }, [pageId]);

  const buildTree = (flatElements: any[]): PageElement[] => {
    const map = new Map();
    const roots: PageElement[] = [];

    flatElements.forEach(el => {
      map.set(el.id, { ...el, children: [] });
    });

    flatElements.forEach(el => {
      const node = map.get(el.id);
      if (el.parentId && map.has(el.parentId)) {
        map.get(el.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const flattenTree = (tree: PageElement[]): any[] => {
    const flat: any[] = [];
    
    const flatten = (nodes: PageElement[], parentId: string | null = null) => {
      nodes.forEach((node, index) => {
        flat.push({
          id: node.id,
          type: node.type,
          properties: node.properties,
          position: index,
          parentId,
        });
        if (node.children && node.children.length > 0) {
          flatten(node.children, node.id);
        }
      });
    };

    flatten(tree);
    return flat;
  };

  const loadPage = async (id: string) => {
    try {
      const { data: page, error: pageError } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("id", id)
        .single();

      if (pageError) throw pageError;

      setPageName(page.name);
      setSlug(page.slug);

      const { data: pageElements, error: elementsError } = await supabase
        .from("landing_page_elements")
        .select("*")
        .eq("landing_page_id", id)
        .order("position");

      if (elementsError) throw elementsError;

      const flatElements = pageElements.map(el => ({
        id: el.id,
        type: el.element_type,
        properties: el.properties,
        position: el.position,
        parentId: el.parent_id,
      }));

      setElements(buildTree(flatElements));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const savePage = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let pageIdToUse = currentPageId;

      if (!pageIdToUse) {
        const { data: newPage, error: pageError } = await supabase
          .from("landing_pages")
          .insert({
            user_id: user.id,
            name: pageName,
            slug: slug || pageName.toLowerCase().replace(/\s+/g, "-"),
            status: "draft",
          })
          .select()
          .single();

        if (pageError) throw pageError;
        pageIdToUse = newPage.id;
        setCurrentPageId(pageIdToUse);
      } else {
        const { error: updateError } = await supabase
          .from("landing_pages")
          .update({ name: pageName, slug })
          .eq("id", pageIdToUse);

        if (updateError) throw updateError;
      }

      // Delete existing elements
      await supabase
        .from("landing_page_elements")
        .delete()
        .eq("landing_page_id", pageIdToUse);

      // Flatten and insert updated elements
      const flatElements = flattenTree(elements);
      if (flatElements.length > 0) {
        const { error: elementsError } = await supabase
          .from("landing_page_elements")
          .insert(
            flatElements.map((el) => ({
              landing_page_id: pageIdToUse,
              element_type: el.type,
              properties: el.properties,
              position: el.position,
              parent_id: el.parentId,
            }))
          );

        if (elementsError) throw elementsError;
      }

      toast({
        title: "Success",
        description: "Landing page saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateElementProperties = (properties: any) => {
    if (!selectedElement) return;
    
    const updated = elements.map(el =>
      el.id === selectedElement.id ? { ...el, properties } : el
    );
    setElements(updated);
    setSelectedElement({ ...selectedElement, properties });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
          className="max-w-xs"
          placeholder="Page Name"
        />
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="max-w-xs"
          placeholder="page-slug"
        />
        <div className="flex-1" />
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={savePage} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <LandingPageSidebar />
        <LandingPageCanvas
          elements={elements}
          onElementsChange={setElements}
          onSelectElement={setSelectedElement}
          selectedElementId={selectedElement?.id || null}
        />
        <LandingPageElementEditor
          element={selectedElement}
          onUpdate={updateElementProperties}
          onClose={() => setSelectedElement(null)}
        />
      </div>
    </div>
  );
};
