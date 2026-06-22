// components/ProjectCard.tsx
"use client";

import {
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  Star,
  StarOff,
  CalendarDays,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectView } from "@/types/project";
import {
  PROJECT_COLORS,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/constants/project";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  view?: ProjectView;
  onToggleArchive: (id: string) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleStar,
  onToggleArchive,
  view = "grid",
}: ProjectCardProps) {
  const progress = project.tasksCount
    ? Math.round(((project.completedTasks || 0) / project.tasksCount) * 100)
    : 0;

  const statusInfo = STATUS_CONFIG[project.status];

  if (view === "list") {
    return (
      <div
        className={cn(
          "group relative bg-card border rounded-lg p-4 transition-all",
          "hover:border-violet-200 hover:shadow-sm",
          project.isArchived && "opacity-60",
        )}
      >
        <div className="flex items-center gap-4">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-lg font-semibold"
            style={{ backgroundColor: project.color || PROJECT_COLORS[0] }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{project.name}</h3>
              {project.isStarred && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px]", statusInfo.badge)}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1",
                    statusInfo.dot,
                  )}
                />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {project.priority}
              </Badge>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="w-32">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Team */}
          {project.teamMembers && project.teamMembers.length > 0 && (
            <div className="flex items-center -space-x-2">
              {project.teamMembers.slice(0, 3).map((member, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.teamMembers.length > 3 && (
                <Avatar className="w-6 h-6 border-2 border-background bg-muted text-[8px]">
                  <AvatarFallback>
                    +{project.teamMembers.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onToggleStar(project._id || project.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                {project.isStarred ? (
                  <StarOff className="w-3.5 h-3.5" />
                ) : (
                  <Star className="w-3.5 h-3.5" />
                )}
                {project.isStarred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project._id || project.id!)}
                className="text-xs gap-2 text-destructive cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      className={cn(
        "group relative bg-card border rounded-lg p-4 transition-all",
        "hover:border-violet-200 hover:shadow-sm hover:-translate-y-0.5",
        project.isArchived && "opacity-60",
      )}
    >
      {/* Color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ backgroundColor: project.color || PROJECT_COLORS[0] }}
      />

      <div className="pt-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium truncate">{project.name}</h3>
              {project.isStarred && (
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onToggleStar(project._id || project.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                {project.isStarred ? (
                  <StarOff className="w-3.5 h-3.5" />
                ) : (
                  <Star className="w-3.5 h-3.5" />
                )}
                {project.isStarred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project._id || project.id!)}
                className="text-xs gap-2 text-destructive cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <Badge
            variant="outline"
            className={cn("text-[10px]", statusInfo.badge)}
          >
            <span
              className={cn("w-1.5 h-1.5 rounded-full mr-1", statusInfo.dot)}
            />
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            {project.priority}
          </Badge>
          {project.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className="flex items-center -space-x-2">
                {project.teamMembers.slice(0, 2).map((member, i) => (
                  <Avatar
                    key={i}
                    className="w-5 h-5 border-2 border-background"
                  >
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-[7px] bg-violet-100 text-violet-700">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.teamMembers.length > 2 && (
                  <Avatar className="w-5 h-5 border-2 border-background bg-muted text-[7px]">
                    <AvatarFallback>
                      +{project.teamMembers.length - 2}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {project.tasksCount || 0} tasks
            </span>
          </div>
          {project.endDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(project.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
