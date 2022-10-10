<?php

/*
 * This file is part of the YesWiki Extension stats.
 *
 * Authors : see README.md file that was distributed with this source code.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace YesWiki\Stats\Service;

use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use YesWiki\Aceditor\Service\ActionsBuilderService as AceditorActionsBuilderService;
use YesWiki\Core\Service\TemplateEngine;
use YesWiki\Wiki;

trait ActionsBuilderServiceCommon
{
    protected $previousData;
    protected $data;
    protected $parentActionsBuilderService;
    protected $renderer;
    protected $wiki;

    public function __construct(TemplateEngine $renderer, Wiki $wiki, $parentActionsBuilderService)
    {
        $this->data = null;
        $this->previousData = null;
        $this->parentActionsBuilderService = $parentActionsBuilderService;
        $this->renderer = $renderer;
        $this->wiki = $wiki;
    }

    public function setPreviousData(?array $data)
    {
        if (is_null($this->previousData)) {
            $this->previousData = is_array($data) ? $data : [];
            if ($this->parentActionsBuilderService && method_exists($this->parentActionsBuilderService, 'setPreviousData')) {
                $this->parentActionsBuilderService->setPreviousData($data);
            }
        }
    }

    // ---------------------
    // Data for the template
    // ---------------------
    public function getData()
    {
        if (is_null($this->data)) {
            if (!empty($this->parentActionsBuilderService)) {
                $this->data = $this->parentActionsBuilderService->getData();
            } else {
                $this->data = $this->previousData;
            }

            $params = $this->wiki->services->get(ParameterBagInterface::class);
            if ($params->get("yeswiki_version") == "doryphore-test" || ($params->get("yeswiki_version") == "doryphore" &&
                preg_match("/^4\.(?:[2-9]|[1-9][0-9])\.(?:[2-9]|[1-9][0-9])$/", $params->get("yeswiki_release")))) {
                if (isset($this->data['action_groups']['management']['actions'])) {
                    $this->data['action_groups']['management']['actions']['stats'] = [
                        'label' => _t('AB_STATS_LABEL'),
                    ];
                }
            }
        }
        return $this->data;
    }
}

if (class_exists(AceditorActionsBuilderService::class, false)) {
    class ActionsBuilderService extends AceditorActionsBuilderService
    {
        use ActionsBuilderServiceCommon;
    }
} else {
    class ActionsBuilderService
    {
        use ActionsBuilderServiceCommon;
    }
}
