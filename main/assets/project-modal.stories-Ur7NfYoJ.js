import{aX as n,ay as R}from"./iframe-C5IvU1p1.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Bm1ZpN-p.js";import{P as H}from"./project-modal-jsfScPdR.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BWUNGluS.js";import"./Select-ef7c0426.esm-BftuGcL6.js";import"./chevron-down-B-GNMi22.js";import"./check-BV27VTuU.js";import"./index-BfYv_0Xi.js";import"./triangle-alert-CsnLWcqb.js";import"./export-menu-DGCotwVV.js";import"./client-DzYxjV8s.js";import"./markdown-preview-B35wWWgm.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CNtU1sQK.js";import"./copy-BH8C-Oj7.js";import"./file-code-corner-BpNJ3oc_.js";import"./loader-circle-Ct20B8y5.js";import"./api-CfohCiYb.js";import"./folder-open-DemtPO30.js";import"./folder-CJH84kAJ.js";import"./tag-color-picker-Vkmwj9d4.js";import"./project-tag-ksAQ5PaK.js";import"./sparkles-DU5uM2QL.js";import"./brain-fGemkI0d.js";import"./chevron-right-BmuFWNV_.js";import"./markdown-editor-WHqJBsXH.js";import"./pencil-LyDfMwEz.js";import"./trash-2-BmU29nzS.js";import"./templates-DAeGdhQj.js";import"./plus-B3vlPcWY.js";import"./task-row-DjsPbJr4.js";import"./i18n-labels-vuqO959G.js";import"./selectable-icon-krdfnaWi.js";import"./hover-expand-button-7qb9JSa7.js";import"./index-DN42q_Re.js";import"./data-refresh-B_Lj1ANM.js";import"./rotate-ccw-BvM3ZJeX.js";import"./play-JMDe0oFH.js";import"./square-terminal-B_7zlaeU.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
