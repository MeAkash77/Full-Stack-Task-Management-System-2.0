import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

// Helper function to verify token and get userId
async function verifyTokenAndGetUserId(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);
  
  if (!decoded || typeof decoded === 'string' || !decoded.userId) {
    return { error: "Invalid token", status: 403 };
  }

  return { userId: decoded.userId };
}

// CREATE TODO
export async function POST(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { userId, task, category, priority, dueDate, notes } =
      await request.json();

    // Ensure the userId from token matches the request
    if (auth.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!userId || !task) {
      return NextResponse.json(
        { error: "User ID and task are required" },
        { status: 400 }
      );
    }

    // Create todo with all fields
    const newTodo = await prisma.task.create({
      data: {
        title: task,
        category: category || "General",
        priority: priority || "medium",
        dueDate: dueDate || null,
        notes: notes || "",
        userId,
        completed: false,
      },
    });

    // Format the response to match TodoItem type
    const formattedTodo = {
      id: newTodo.id,
      task: newTodo.title,
      category: newTodo.category || "General",
      priority: (newTodo.priority as "high" | "medium" | "low") || "medium",
      dueDate: newTodo.dueDate || "",
      notes: newTodo.notes || "",
      completed: newTodo.completed,
      createdAt: newTodo.createdAt,
    };

    return NextResponse.json(formattedTodo, { status: 201 });
  } catch (error) {
    console.error("Error adding todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET TODOS
export async function GET(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // Ensure users can only access their own todos
    if (requestedUserId && requestedUserId !== auth.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const todos = await prisma.task.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
    });

    // Format todos to match TodoItem type
    const formattedTodos = todos.map(todo => ({
      id: todo.id,
      task: todo.title,
      category: todo.category || "General",
      priority: (todo.priority as "high" | "medium" | "low") || "medium",
      dueDate: todo.dueDate || "",
      notes: todo.notes || "",
      completed: todo.completed,
      createdAt: todo.createdAt,
    }));

    // Always return an array (even if empty)
    return NextResponse.json(formattedTodos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    // Return empty array on error instead of error object
    return NextResponse.json([]);
  }
}

// UPDATE TODO (toggle completed)
export async function PATCH(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId, completed } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to the authenticated user
    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.task.update({
      where: { id: todoId },
      data: { completed },
    });

    const formattedTodo = {
      id: updated.id,
      task: updated.title,
      category: updated.category || "General",
      priority: (updated.priority as "high" | "medium" | "low") || "medium",
      dueDate: updated.dueDate || "",
      notes: updated.notes || "",
      completed: updated.completed,
      createdAt: updated.createdAt,
    };

    return NextResponse.json(formattedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE FULL TODO
export async function PUT(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId, task, category, priority, dueDate, notes, completed } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to the authenticated user
    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    // Update all fields
    const updated = await prisma.task.update({
      where: { id: todoId },
      data: {
        title: task,
        category: category,
        priority: priority,
        dueDate: dueDate,
        notes: notes,
        completed: completed,
      },
    });

    const formattedTodo = {
      id: updated.id,
      task: updated.title,
      category: updated.category || "General",
      priority: (updated.priority as "high" | "medium" | "low") || "medium",
      dueDate: updated.dueDate || "",
      notes: updated.notes || "",
      completed: updated.completed,
      createdAt: updated.createdAt,
    };

    return NextResponse.json(formattedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE TODO
export async function DELETE(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to the authenticated user
    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}