import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ComputeService } from './compute.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LaunchSessionDto, RestartSessionDto, AnalyzeWorkloadDto, GenerateExplanationDto, CreateRecommendationSessionDto, UpdateRecommendationSessionDto } from './compute.dto';

@Controller('api/compute')
@UseGuards(JwtAuthGuard)
export class ComputeController {
  constructor(private readonly computeService: ComputeService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  /**
   * Get all compute configurations with current availability
   * Returns configs sorted by sortOrder with available flag and maxLaunchable count
   */
  @Get('configs')
  async getConfigs() {
    return this.computeService.getConfigsWithAvailability();
  }

  /**
   * Get current resource usage summary
   * Returns total, used, and available resources
   */
  @Get('resources/usage')
  async getResourceUsage() {
    return this.computeService.getResourceUsage();
  }

  /**
   * Launch a new compute session
   * Validates resources, wallet balance, and storage requirements
   * Uses serializable transaction to prevent double-allocation
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async launchSession(
    @Req() req: { user: { id: string } },
    @Body() dto: LaunchSessionDto,
  ) {
    const userId = req.user.id;
    return this.computeService.launchSession(userId, dto);
  }

  /**
   * Get all sessions for the authenticated user
   * Includes computed uptime and cost-so-far for running sessions
   */
  @Get('sessions')
  async getUserSessions(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.computeService.getUserSessions(userId);
  }

  /**
   * Get detailed information about a specific session
   * Includes wallet holds, billing charges, and resource reservation
   */
  @Get('sessions/:id')
  async getSessionDetail(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionDetail(userId, id);
  }

  /**
   * Terminate a session
   * Releases resources, calculates final cost, and creates billing charge
   * Idempotent: returns current state if already terminated
   */
  @Post('sessions/:id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateSession(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.terminateSession(userId, id);
  }

  /**
   * Restart a running session
   * Calls orchestration service to restart the container
   */
  @Post('sessions/:id/restart')
  @HttpCode(HttpStatus.OK)
  async restartSession(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() _dto: RestartSessionDto,
  ) {
    const userId = req.user.id;
    return this.computeService.restartSession(userId, id);
  }

  /**
   * Get container logs for a session
   * Returns the last 100 lines of container logs
   */
  @Get('sessions/:id/logs')
  async getSessionLogs(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionLogs(userId, id);
  }

  /**
   * Get connection info for a session
   * Returns session URL, username, and decrypted password if session is ready
   */
  @Get('sessions/:id/connection')
  async getSessionConnection(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionConnection(userId, id);
  }

  /**
   * Get all events for a session
   * Returns chronological list of session lifecycle events
   */
  @Get('sessions/:id/events')
  async getSessionEvents(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionEvents(userId, id);
  }

  // ============================================================================
  // ADMIN/MONITORING ENDPOINTS
  // ============================================================================

  /**
   * Get resource status for all nodes
   * Shows total, allocated, and available resources per node
   */
  @Get('resources')
  async getNodeResourceStatus() {
    return this.computeService.getNodeResourceStatus();
  }

  /**
   * Get all sessions across all users (admin only)
   * Includes user info for each session
   */
  @Get('admin/sessions')
  async getAllSessions() {
    return this.computeService.getAllSessions();
  }

  // ============================================================================
  // WORKLOAD ANALYSIS ENDPOINTS
  // ============================================================================

  /**
   * Extract text from uploaded document (PDF, DOCX, TXT)
   * Returns extracted text and word count
   */
  @Post('extract-document')
  @UseGuards(JwtAuthGuard)
  async extractDocument(@Req() req: FastifyRequest & { user: { id: string } }): Promise<{ text: string; wordCount: number }> {
    const parts = req.parts();
    let fileBuffer: Buffer | null = null;
    let mimetype = '';
    
    for await (const part of parts) {
      if (part.type === 'file') {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (!allowedTypes.includes(part.mimetype)) {
          throw new BadRequestException('Unsupported file type. Allowed: PDF, DOCX, TXT');
        }
        
        // Read file into buffer (max 5MB)
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of part.file) {
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            throw new BadRequestException('File too large. Maximum size is 5MB');
          }
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
        mimetype = part.mimetype;
      }
    }
    
    if (!fileBuffer) {
      throw new BadRequestException('No file provided');
    }
    
    return this.computeService.extractDocumentText(fileBuffer, mimetype);
  }

  /**
   * Analyze workload description using LLM
   * Returns structured analysis with detected goal, frameworks, VRAM needs, etc.
   */
  @Post('analyze-workload')
  @UseGuards(JwtAuthGuard)
  async analyzeWorkload(@Body() dto: AnalyzeWorkloadDto): Promise<any> {
    if (!dto.description || dto.description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }
    // Limit to ~500 words worth of text
    const trimmed = dto.description.slice(0, 5000);
    return this.computeService.analyzeWorkload(trimmed, dto.primaryGoal);
  }

  /**
   * Generate explanation for why a specific config is recommended
   * Returns a human-readable explanation
   */
  @Post('generate-explanation')
  @UseGuards(JwtAuthGuard)
  async generateExplanation(@Body() dto: GenerateExplanationDto): Promise<{ explanation: string }> {
    return this.computeService.generateExplanation(
      dto.configSlug,
      dto.configSpecs,
      dto.userGoal,
      dto.userContext,
    );
  }

  /**
   * Create a new recommendation session
   * Persists workload analysis data and initial selections
   */
  @Post('recommendation-session')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRecommendationSession(
    @Body() dto: CreateRecommendationSessionDto,
    @Req() req: any,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.computeService.createRecommendationSession(userId, dto);
  }

  /**
   * Update an existing recommendation session
   * Used to save user selections and final config choice
   */
  @Patch('recommendation-session/:id')
  @UseGuards(JwtAuthGuard)
  async updateRecommendationSession(
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationSessionDto,
    @Req() req: any,
  ) {
    const userId = req.user.id || req.user.sub;
    await this.computeService.updateRecommendationSession(userId, id, dto);
    return { success: true };
  }
}
