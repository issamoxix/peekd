import { useState, useEffect } from "react";
import { useProject, useUpdateProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button, Input, Select, Textarea, Card } from "../ui";
import type { BrandBrief } from "shared";

const TONE_OPTIONS = [
  { value: "Professional", label: "Professional" },
  { value: "Friendly", label: "Friendly" },
  { value: "Technical", label: "Technical" },
  { value: "Thought Leader", label: "Thought Leader" },
];

export function BrandBriefForm() {
  const { currentProjectId } = useProjectContext();
  const { data: project, isLoading } = useProject(currentProjectId);
  const updateProject = useUpdateProject();

  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState("");
  const [desiredTone, setDesiredTone] = useState<BrandBrief["desiredTone"]>("Professional");
  const [desiredClaims, setDesiredClaims] = useState("");
  const [keyDifferentiators, setKeyDifferentiators] = useState("");
  const [competitors, setCompetitors] = useState("");

  useEffect(() => {
    if (project?.brief) {
      setBrandName(project.brief.brandName);
      setDomain(project.brief.domain);
      setCategory(project.brief.category);
      setDesiredTone(project.brief.desiredTone);
      setDesiredClaims(project.brief.desiredClaims.join("\n"));
      setKeyDifferentiators(project.brief.keyDifferentiators.join("\n"));
      setCompetitors(project.brief.competitors.join(", "));
    }
  }, [project]);

  const handleSave = () => {
    if (!currentProjectId) return;

    updateProject.mutate({
      id: currentProjectId,
      data: {
        brandName,
        domain,
        category,
        desiredTone,
        desiredClaims: desiredClaims.split("\n").filter(Boolean),
        keyDifferentiators: keyDifferentiators.split("\n").filter(Boolean),
        competitors: competitors.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
  };

  if (isLoading) {
    return <Card><p className="text-gray-500">Loading...</p></Card>;
  }

  const isComplete = brandName && domain && category && desiredClaims;

  return (
    <Card title="Brand Brief">
      <Input
        label="Brand Name"
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
        placeholder="e.g., Acme Corp"
      />
      <Input
        label="Domain"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="e.g., acme.com"
      />
      <Input
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="e.g., project management software"
      />
      <Select
        label="Desired Tone"
        value={desiredTone}
        onChange={(e) => setDesiredTone(e.target.value as BrandBrief["desiredTone"])}
        options={TONE_OPTIONS}
      />
      <Textarea
        label="Desired Claims"
        hint="What do you want LLMs to say? One claim per line."
        value={desiredClaims}
        onChange={(e) => setDesiredClaims(e.target.value)}
        placeholder="Best-in-class collaboration features&#10;Enterprise-grade security&#10;Used by Fortune 500 companies"
      />
      <Textarea
        label="Key Differentiators"
        hint="What makes you different? One per line."
        value={keyDifferentiators}
        onChange={(e) => setKeyDifferentiators(e.target.value)}
        placeholder="AI-powered automation&#10;Real-time collaboration&#10;Industry-leading uptime"
      />
      <Input
        label="Competitors"
        value={competitors}
        onChange={(e) => setCompetitors(e.target.value)}
        placeholder="Competitor A, Competitor B, Competitor C"
      />

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={updateProject.isPending}>
          {updateProject.isPending ? "Saving..." : "Save Brief"}
        </Button>
        {!isComplete && (
          <p className="text-sm text-amber-600 self-center">
            Fill in required fields to enable analysis
          </p>
        )}
      </div>
    </Card>
  );
}
